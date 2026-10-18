// Pure planning logic for db/import-heads.mjs: no database, no filesystem.
// The matching rules live in lib/ (single source of truth); Node 24 loads those
// .ts files directly because they have no imports of their own.
import { matchMember } from '../lib/member-match.ts';
import { normalizePhone } from '../lib/interview-message.ts';

// rows: [{ name, phone? }], members: [{ id, fullName }]
// Returns { matched: [{ memberId, phone|null }], unmatched: [name], ambiguous: [name] }.
// Two rows resolving to the same member are both ambiguous and neither applies.
export function planImport(rows, members) {
  const resolved = rows.map((row) => ({ row, member: matchMember(row.name, members) }));

  const counts = new Map();
  for (const { member } of resolved) {
    if (member) counts.set(member.id, (counts.get(member.id) ?? 0) + 1);
  }

  const matched = [];
  const unmatched = [];
  const ambiguous = [];
  for (const { row, member } of resolved) {
    if (!member) unmatched.push(row.name);
    else if (counts.get(member.id) > 1) ambiguous.push(row.name);
    else {
      const phone = row.phone?.trim() ?? '';
      matched.push({ memberId: member.id, phone: normalizePhone(phone) ? phone : null });
    }
  }
  return { matched, unmatched, ambiguous };
}
