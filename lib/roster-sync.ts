import { nameTokens, type Member } from './member-match';

// Two spellings of the same person must share a key, or saving the roster
// would delete the member (and, by ON DELETE CASCADE, their interviews) and add
// a "new" one. So the key is the sorted token set the name matcher uses:
// accents, case, particles, a leading title and the "Surname, Given" order do
// not change it. A name made only of a title falls back to its plain text.
function key(name: string): string {
  const tokens = nameTokens(name);
  return tokens.length > 0 ? [...new Set(tokens)].sort().join(' ') : name.trim().toLowerCase();
}

// Saving the roster must not delete everybody and re-insert them: members now
// carry data (phone, head of household) and interviews point at them. So the
// saved list is compared with the current one and only the difference is
// applied: new names are added, names no longer listed are removed.
export function diffRoster(
  current: Member[],
  names: string[]
): { toAdd: string[]; toRemoveIds: number[] } {
  const wanted = new Set(names.map(key));
  const existing = new Set(current.map((member) => key(member.fullName)));

  const toAdd: string[] = [];
  const queued = new Set<string>();
  for (const name of names) {
    const k = key(name);
    if (!k || existing.has(k) || queued.has(k)) continue;
    queued.add(k);
    toAdd.push(name.trim());
  }

  const toRemoveIds = current.filter((member) => !wanted.has(key(member.fullName))).map((m) => m.id);
  return { toAdd, toRemoveIds };
}
