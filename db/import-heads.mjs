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
import { isImportRows, planImport } from './roster-import.mjs';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const file = args.find((arg) => !arg.startsWith('--'));

if (!process.env.DATABASE_URL || !file) {
  console.error('Usage: node --env-file=<env file> db/import-heads.mjs <rows.json> [--apply]');
  console.error('DATABASE_URL must be set.');
  process.exit(1);
}

// The file holds phone numbers, and a JSON.parse error quotes the text around
// the problem, so only a fixed message is ever printed.
const text = await readFile(file, 'utf8');
let rows;
try {
  rows = JSON.parse(text);
} catch {
  console.error('The rows file is not valid JSON.');
  process.exit(1);
}
if (!isImportRows(rows)) {
  console.error('The file must be a JSON array of { "name": string, "phone"?: string }.');
  process.exit(1);
}

console.log(`Database: ${new URL(process.env.DATABASE_URL).hostname}`);
const sql = neon(process.env.DATABASE_URL);

// A database error may echo the values of a statement (phones included), so
// only its code and constraint name are printed.
function failWith(error) {
  const code = error?.code ?? 'unknown';
  const constraint = error?.constraint ? ` (constraint ${error.constraint})` : '';
  console.error(`Database error ${code}${constraint}. Nothing was written.`);
  process.exit(1);
}

let members;
try {
  members = (await sql.query('SELECT id, full_name FROM members')).map((row) => ({
    id: row.id,
    fullName: row.full_name,
  }));
} catch (error) {
  failWith(error);
}

const plan = planImport(rows, members);
const withPhone = plan.matched.filter((m) => m.phone !== null).length;

console.log(`Rows:       ${rows.length}`);
console.log(`Matched:    ${plan.matched.length} (${withPhone} with a usable phone)`);
console.log(`Unmatched:  ${plan.unmatched.length}`);
for (const name of plan.unmatched) console.log(`  - ${name}`);
console.log(`Ambiguous:  ${plan.ambiguous.length}`);
for (const name of plan.ambiguous) console.log(`  - ${name}`);
console.log(`Partial:    ${plan.fuzzy.length} (matched, but not every word is the same; check them)`);
for (const { input, member } of plan.fuzzy) console.log(`  - ${input} -> ${member}`);

if (!apply) {
  console.log('Dry run: nothing was written. Pass --apply to write.');
  process.exit(0);
}

if (plan.matched.length === 0) {
  console.log('Nothing to apply: no row matched a member.');
  process.exit(0);
}

try {
  await sql.transaction(
    plan.matched.map((m) =>
      sql.query('UPDATE members SET is_head = true, phone = COALESCE($2, phone) WHERE id = $1', [
        m.memberId,
        m.phone,
      ])
    )
  );
} catch (error) {
  failWith(error);
}
console.log(`Applied: ${plan.matched.length} members updated.`);
