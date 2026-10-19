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

export interface RosterChange {
  toAdd: string[];
  toRemoveIds: number[];
}

// The roster is edited as one list, but saving it only applies the difference:
// members that are still listed keep their row (phone, head of household and
// their interviews).
export async function planRoster(names: string[]): Promise<RosterChange> {
  return diffRoster(await listMembers(), names);
}

// Removing a member also deletes their interviews (ON DELETE CASCADE), so the
// save asks first about anyone who carries data. One query; names only.
export async function removedMembersWithData(ids: number[]): Promise<string[]> {
  if (ids.length === 0) return [];
  const rows = (await sql.query(
    `SELECT m.full_name FROM members m
      WHERE m.id = ANY($1::int[])
        AND (m.is_head
             OR coalesce(btrim(m.phone), '') <> ''
             OR EXISTS (SELECT 1 FROM interviews i WHERE i.member_id = m.id))`,
    [ids]
  )) as { full_name: string }[];
  return rows.map((row) => row.full_name).sort(byName.compare);
}

// Removing and adding run in one transaction so a failed insert cannot leave
// the roster half changed.
export async function replaceMembers({ toAdd, toRemoveIds }: RosterChange): Promise<void> {
  if (toAdd.length === 0 && toRemoveIds.length === 0) return;
  await sql.transaction([
    sql.query(`DELETE FROM members WHERE id = ANY($1::int[])`, [toRemoveIds]),
    sql.query(`INSERT INTO members (full_name) SELECT unnest($1::text[])`, [toAdd]),
  ]);
}
