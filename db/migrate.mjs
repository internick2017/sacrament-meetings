// Applies every pending migration in db/migrations, in order.
//
//   yarn migrate
//
// Reads DATABASE_URL from .env.local via node --env-file (see package.json).
// Safe to run repeatedly: migrations already recorded in schema_migrations are
// skipped.

import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { pendingMigrations, splitStatements } from './pending.mjs';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set. Is .env.local present?');
  process.exit(1);
}

const sql = neon(process.env.DATABASE_URL);

// The ledger of what has run. Created here rather than in a migration, because
// the runner needs it before it can read any migration.
await sql.query(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    name        text PRIMARY KEY,
    applied_at  timestamptz NOT NULL DEFAULT now()
  )
`);

const applied = (await sql.query(`SELECT name FROM schema_migrations`)).map((r) => r.name);
const files = await readdir(MIGRATIONS_DIR);
const pending = pendingMigrations(files, applied);

if (pending.length === 0) {
  console.log('Nothing to migrate.');
  process.exit(0);
}

for (const name of pending) {
  const text = await readFile(join(MIGRATIONS_DIR, name), 'utf8');
  const statements = splitStatements(text);

  process.stdout.write(`Applying ${name} (${statements.length} statements)... `);
  try {
    // The whole file plus its ledger entry go in one transaction: a migration
    // that fails halfway leaves the database exactly as it was.
    await sql.transaction([
      ...statements.map((statement) => sql.query(statement)),
      sql.query(`INSERT INTO schema_migrations (name) VALUES ($1)`, [name]),
    ]);
    console.log('ok');
  } catch (error) {
    console.log('FAILED');
    console.error(error);
    process.exit(1);
  }
}

console.log(`Applied ${pending.length} migration(s).`);
