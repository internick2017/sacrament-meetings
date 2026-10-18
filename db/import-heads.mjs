// One-time import of heads of household and their phones into existing members.
//
//   node --env-file=.env.local db/import-heads.mjs <rows.json>            dry run
//   node --env-file=.env.local db/import-heads.mjs <rows.json> --apply    writes
//
// rows.json is [{ "name": string, "phone"?: string }]. Names are matched
// against the members already in the database (db/roster-import.mjs); members
// are never created. Phone numbers are never printed. With --apply, every
// matched member gets is_head = true and, when the row has a valid phone, that
// phone (an existing phone is kept when the row has none), all in ONE
// transaction.

import { readFile } from 'node:fs/promises';
import { neon } from '@neondatabase/serverless';
import { planImport } from './roster-import.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const file = args.find((arg) => !arg.startsWith('--'));

if (!process.env.DATABASE_URL || !file) {
  console.error('Usage: node --env-file=<env file> db/import-heads.mjs <rows.json> [--apply]');
  console.error('DATABASE_URL must be set.');
  process.exit(1);
}

const rows = JSON.parse(await readFile(file, 'utf8'));
if (!Array.isArray(rows) || rows.some((row) => typeof row?.name !== 'string')) {
  console.error('The file must be a JSON array of { "name": string, "phone"?: string }.');
  process.exit(1);
}

console.log(`Database: ${new URL(process.env.DATABASE_URL).hostname}`);
const sql = neon(process.env.DATABASE_URL);

const members = (await sql.query('SELECT id, full_name FROM members')).map((row) => ({
  id: row.id,
  fullName: row.full_name,
}));

const plan = planImport(rows, members);
const withPhone = plan.matched.filter((m) => m.phone !== null).length;

console.log(`Rows:       ${rows.length}`);
console.log(`Matched:    ${plan.matched.length} (${withPhone} with a usable phone)`);
console.log(`Unmatched:  ${plan.unmatched.length}`);
for (const name of plan.unmatched) console.log(`  - ${name}`);
console.log(`Ambiguous:  ${plan.ambiguous.length}`);
for (const name of plan.ambiguous) console.log(`  - ${name}`);

if (!apply) {
  console.log('Dry run: nothing was written. Pass --apply to write.');
  process.exit(0);
}

await sql.transaction(
  plan.matched.map((m) =>
    sql.query('UPDATE members SET is_head = true, phone = COALESCE($2, phone) WHERE id = $1', [
      m.memberId,
      m.phone,
    ])
  )
);
console.log(`Applied: ${plan.matched.length} members updated.`);
