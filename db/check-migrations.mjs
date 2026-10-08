// Stops a build whose code expects migrations the database has not received.
//
// Runs before `next build` (see package.json). On Vercel that is the database
// the deployment will talk to, so shipping code ahead of `yarn migrate:prod`
// fails here and the previous deployment stays live, instead of the new one
// going out and failing at runtime on a missing table or column.
//
// Read-only: it never applies anything.

import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { neon } from '@neondatabase/serverless';
import { pendingMigrations } from './pending.mjs';

const MIGRATIONS_DIR = join(dirname(fileURLToPath(import.meta.url)), 'migrations');

// A local build checks the development branch. On Vercel there is no
// .env.local and the platform provides DATABASE_URL.
try {
  process.loadEnvFile('.env.local');
} catch {
  // No .env.local: the environment already has what it needs, or nothing does.
}

async function findPending() {
  const sql = neon(process.env.DATABASE_URL);
  let applied = [];
  try {
    applied = (await sql.query(`SELECT name FROM schema_migrations`)).map((row) => row.name);
  } catch (error) {
    // 42P01 = undefined_table: a database nothing has been migrated into yet.
    if (error?.code !== '42P01') {
      throw error;
    }
  }
  return pendingMigrations(await readdir(MIGRATIONS_DIR), applied);
}

if (!process.env.DATABASE_URL) {
  if (process.env.VERCEL) {
    console.error('Migration check: DATABASE_URL is not available to the build.');
    process.exitCode = 1;
  } else {
    console.log('Migration check skipped: no DATABASE_URL.');
  }
} else {
  const host = new URL(process.env.DATABASE_URL).hostname;
  const pending = await findPending();
  if (pending.length === 0) {
    console.log(`Migration check: ${host} is up to date.`);
  } else {
    console.error(`Migration check FAILED: ${host} is missing ${pending.join(', ')}.`);
    console.error(
      process.env.VERCEL
        ? 'Run `yarn migrate:prod` on your machine, then redeploy.'
        : 'Run `yarn migrate`.'
    );
    process.exitCode = 1;
  }
}
