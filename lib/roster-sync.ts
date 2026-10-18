import type { Member } from './member-match';

// Same comparison as the members_full_name_lower_idx index: lowercased, with
// the edges trimmed.
function key(name: string): string {
  return name.trim().toLowerCase();
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
