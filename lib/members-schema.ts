export const MAX_MEMBERS = 1000;
export const MAX_MEMBER_NAME_LENGTH = 120;

export type RosterParse =
  | { ok: true; names: string[] }
  | { ok: false; error: 'tooMany' | 'tooLong' };

// One name per line. Duplicates are dropped case-insensitively because the
// table has a unique index on lower(full_name).
export function parseRosterText(text: string): RosterParse {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (lines.length > MAX_MEMBERS) return { ok: false, error: 'tooMany' };
  if (lines.some((line) => line.length > MAX_MEMBER_NAME_LENGTH)) return { ok: false, error: 'tooLong' };

  const seen = new Set<string>();
  const names = lines.filter((line) => {
    const key = line.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  return { ok: true, names };
}
