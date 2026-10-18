import { sql } from './db';
import type { Member } from './member-match';
import { diffRoster } from './roster-sync';

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

// The roster is edited as one list, but saving it only applies the difference:
// members that are still listed keep their row (phone, head of household and
// their interviews). Removing and adding run in one transaction so a failed
// insert cannot leave the roster half changed.
export async function replaceMembers(names: string[]): Promise<void> {
  const { toAdd, toRemoveIds } = diffRoster(await listMembers(), names);
  if (toAdd.length === 0 && toRemoveIds.length === 0) return;
  await sql.transaction([
    sql.query(`DELETE FROM members WHERE id = ANY($1::int[])`, [toRemoveIds]),
    sql.query(`INSERT INTO members (full_name) SELECT unnest($1::text[])`, [toAdd]),
  ]);
}
