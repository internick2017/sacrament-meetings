// Loads a file written by db/backup.mjs into the database DATABASE_URL names.
//
//   node --env-file=.env.local db/restore.mjs <file>             into an empty database
//   node --env-file=.env.local db/restore.mjs <file> --replace   wipe the data first
//
// The target must already be migrated to the same point as the backup
// (`yarn migrate`). Everything happens in one transaction: either every table
// is restored or nothing changes.

import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { BACKUP_TABLES, listPublicTables, unfiledTables } from './backup-tables.mjs';

const args = process.argv.slice(2);
const replace = args.includes('--replace');
const file = args.find((arg) => !arg.startsWith('--'));

if (!process.env.DATABASE_URL || !file) {
  console.error('Usage: node --env-file=<env file> db/restore.mjs <backup file> [--replace]');
  process.exit(1);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

const backup = JSON.parse(await readFile(file, 'utf8'));
const host = new URL(process.env.DATABASE_URL).hostname;
console.log(`Backup:   ${backup.takenAt} from ${backup.host}`);
console.log(`Database: ${host}`);
const sql = neon(process.env.DATABASE_URL);

const missing = BACKUP_TABLES.filter((table) => !Array.isArray(backup.tables?.[table]));
if (missing.length > 0) {
  fail(`The backup has no data for: ${missing.join(', ')}. It was made by an older version.`);
}

const unfiled = unfiledTables(await listPublicTables(sql));
if (unfiled.length > 0) {
  fail(`The database has tables this script does not know: ${unfiled.join(', ')}.`);
}

const applied = (await sql.query(`SELECT name FROM schema_migrations ORDER BY name`)).map(
  (row) => row.name
);
if (JSON.stringify(applied) !== JSON.stringify(backup.migrations)) {
  fail(
    `Schema mismatch. The backup was taken at migration ${backup.migrations.at(-1)}, ` +
      `the database is at ${applied.at(-1) ?? 'none'}. Migrate the database to the same point first.`
  );
}

if (!replace) {
  const counts = await sql.transaction(
    BACKUP_TABLES.map((table) => sql.query(`SELECT count(*)::int AS n FROM ${table}`))
  );
  const nonEmpty = BACKUP_TABLES.filter((_, index) => counts[index][0].n > 0);
  if (nonEmpty.length > 0) {
    fail(
      `These tables already hold data: ${nonEmpty.join(', ')}. ` +
        `Run again with --replace to wipe them and load the backup instead.`
    );
  }
}

const serialTables = (
  await sql.transaction(
    BACKUP_TABLES.map((table) => sql.query(`SELECT pg_get_serial_sequence($1, 'id') AS seq`, [table]))
  )
)
  .map((rows, index) => (rows[0].seq ? BACKUP_TABLES[index] : null))
  .filter(Boolean);

await sql.transaction([
  ...(replace ? [sql.query(`TRUNCATE ${BACKUP_TABLES.join(', ')} RESTART IDENTITY CASCADE`)] : []),
  // jsonb_populate_recordset casts every value back to its column's own type,
  // the mirror image of the to_jsonb() the backup was written with.
  ...BACKUP_TABLES.map((table) =>
    sql.query(
      `INSERT INTO ${table} SELECT * FROM jsonb_populate_recordset(null::${table}, $1::jsonb)`,
      [JSON.stringify(backup.tables[table])]
    )
  ),
  // Rows arrive with their original ids, so each id sequence has to be moved
  // past them or the next insert would collide.
  ...serialTables.map((table) =>
    sql.query(
      `SELECT setval(pg_get_serial_sequence('${table}', 'id'), coalesce((SELECT max(id) FROM ${table}), 0) + 1, false)`
    )
  ),
]);

for (const table of BACKUP_TABLES) {
  console.log(`  ${table}: ${backup.tables[table].length}`);
}
console.log('Restored.');
