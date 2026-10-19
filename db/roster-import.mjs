// Pure planning logic for db/import-heads.mjs: no database, no filesystem.
// The matching rules live in lib/ (single source of truth). Node 24 loads
// those .ts files directly only because they import nothing themselves: it
// strips types but cannot resolve the extensionless imports lib/ uses. That
// is why the phone rule lives in lib/phone.ts and not in interview-message.ts.
import { matchMember, nameTokens } from '../lib/member-match.ts';
import { normalizePhone } from '../lib/phone.ts';

// The input file must be [{ name: string, phone?: string }]. A phone that is
// present but not a string (a number, null) is refused rather than guessed.
export function isImportRows(rows) {
  return (
    Array.isArray(rows) &&
    rows.every(
      (row) =>
        row !== null &&
        typeof row === 'object' &&
        typeof row.name === 'string' &&
        (row.phone === undefined || typeof row.phone === 'string')
    )
  );
}

function tokenKey(name) {
  return [...new Set(nameTokens(name))].sort().join(' ');
}

// rows: [{ name, phone? }], members: [{ id, fullName }]
// Returns { matched: [{ memberId, phone|null }], unmatched: [name], ambiguous: [name],
//           fuzzy: [{ input, member }] }.
// Two rows resolving to the same member are both ambiguous and neither applies.
// `fuzzy` lists, by name only, the applied matches that are partial (one name
// extends the other), so a dry run can show them for a human check.
export function planImport(rows, members) {
  const resolved = rows.map((row) => ({ row, member: matchMember(row.name, members) }));

  const counts = new Map();
  for (const { member } of resolved) {
    if (member) counts.set(member.id, (counts.get(member.id) ?? 0) + 1);
  }

  const matched = [];
  const unmatched = [];
  const ambiguous = [];
  const fuzzy = [];
  for (const { row, member } of resolved) {
    if (!member) unmatched.push(row.name);
    else if (counts.get(member.id) > 1) ambiguous.push(row.name);
    else {
      const phone = row.phone?.trim() ?? '';
      matched.push({ memberId: member.id, phone: normalizePhone(phone) ? phone : null });
      if (tokenKey(row.name) !== tokenKey(member.fullName)) {
        fuzzy.push({ input: row.name, member: member.fullName });
      }
    }
  }
  return { matched, unmatched, ambiguous, fuzzy };
}
