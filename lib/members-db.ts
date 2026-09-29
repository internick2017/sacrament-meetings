import { sql } from './db';
import type { Member } from './member-match';

const byName = new Intl.Collator('pt', { sensitivity: 'base' });

export async function listMembers(): Promise<Member[]> {
  const rows = (await sql.query(`SELECT id, full_name FROM members`)) as {
    id: number;
    full_name: string;
  }[];
  return rows
    .map((row) => ({ id: row.id, fullName: row.full_name }))
    .sort((a, b) => byName.compare(a.fullName, b.fullName));
}

// The roster is edited as one list, so saving replaces it whole. Both
// statements run in one transaction: a failed insert must not leave the ward
// with an empty roster.
export async function replaceMembers(names: string[]): Promise<void> {
  await sql.transaction([
    sql.query(`DELETE FROM members`),
    sql.query(`INSERT INTO members (full_name) SELECT unnest($1::text[])`, [names]),
  ]);
}
