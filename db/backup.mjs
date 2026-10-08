// Writes every row of the production database to one dated JSON file.
//
//   yarn backup
//
// Reads DATABASE_URL and BACKUP_DIR from .env.prod-db (see package.json). The
// file holds data only: the schema is db/migrations, and db/restore.mjs loads a
// file back into a migrated database. The file contains member names and the
// accounts table, so BACKUP_DIR must stay outside the repository.

import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { BACKUP_TABLES, listPublicTables, unfiledTables } from './backup-tables.mjs';

// Weekly runs: about three months of history.
const KEEP = 12;
const FILE_PATTERN = /^backup-\d{4}-\d{2}-\d{2}\.json$/;

const { DATABASE_URL, BACKUP_DIR } = process.env;
if (!DATABASE_URL || !BACKUP_DIR) {
  console.error('DATABASE_URL and BACKUP_DIR must both be set (see .env.prod-db).');
  process.exit(1);
}

const host = new URL(DATABASE_URL).hostname;
console.log(`Database: ${host}`);
const sql = neon(DATABASE_URL);

const unfiled = unfiledTables(await listPublicTables(sql));
if (unfiled.length > 0) {
  console.error(
    `Not backed up: ${unfiled.join(', ')}. Add each table to BACKUP_TABLES or SKIPPED_TABLES in db/backup-tables.mjs.`
  );
  process.exit(1);
}

// One read-only snapshot, so the tables are consistent with each other even if
// someone saves a meeting while the backup runs. Postgres serializes the rows
// itself (to_jsonb), which keeps dates and timestamps exactly as stored instead
// of passing them through JavaScript Date objects.
const results = await sql.transaction(
  [
    sql.query(`SELECT name FROM schema_migrations ORDER BY name`),
    ...BACKUP_TABLES.map((table) =>
      sql.query(
        `SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.ctid), '[]'::jsonb)::text AS rows FROM ${table} t`
      )
    ),
  ],
  { readOnly: true, isolationLevel: 'RepeatableRead' }
);

const [migrationRows, ...tableResults] = results;
const tables = {};
BACKUP_TABLES.forEach((table, index) => {
  tables[table] = JSON.parse(tableResults[index][0].rows);
});

const takenAt = new Date().toISOString();
const backup = {
  takenAt,
  host,
  migrations: migrationRows.map((row) => row.name),
  tables,
};

await mkdir(BACKUP_DIR, { recursive: true });
const fileName = `backup-${takenAt.slice(0, 10)}.json`;
const filePath = join(BACKUP_DIR, fileName);
const partialPath = `${filePath}.partial`;

// Written under another name and renamed only after it reads back intact, so a
// crash or a full disk never leaves a truncated file that looks like a backup.
await writeFile(partialPath, JSON.stringify(backup));
const readBack = JSON.parse(await readFile(partialPath, 'utf8'));
for (const table of BACKUP_TABLES) {
  if (readBack.tables[table].length !== tables[table].length) {
    console.error(`Verification failed for ${table}. The partial file was left at ${partialPath}.`);
    process.exit(1);
  }
}
await rename(partialPath, filePath);

for (const table of BACKUP_TABLES) {
  console.log(`  ${table}: ${tables[table].length}`);
}
console.log(`Saved ${filePath}`);

const files = (await readdir(BACKUP_DIR)).filter((name) => FILE_PATTERN.test(name)).sort();
for (const old of files.slice(0, Math.max(0, files.length - KEEP))) {
  await rm(join(BACKUP_DIR, old));
  console.log(`Removed old backup ${old}`);
}
