export interface Member {
  id: number;
  fullName: string;
}

// Only stripped from the start of a name: clerks write "Elder Souza" or
// "Irmã Kênia", and the title says nothing about who the person is.
const TITLES = new Set([
  'elder',
  'pres',
  'presidente',
  'irmao',
  'irma',
  'irmaos',
  'bispo',
  'sister',
  'brother',
  'hermano',
  'hermana',
]);

const PARTICLES = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'del', 'la', 'y']);

export function nameTokens(raw: string): string[] {
  const tokens = raw
    .replace(/\s*\([^()]*\)\s*$/, '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

  let start = 0;
  while (start < tokens.length && TITLES.has(tokens[start])) start += 1;
  return tokens.slice(start).filter((token) => !PARTICLES.has(token));
}

function isSubset(small: Set<string>, big: Set<string>): boolean {
  for (const token of small) if (!big.has(token)) return false;
  return true;
}

function sameSet(a: Set<string>, b: Set<string>): boolean {
  return a.size === b.size && isSubset(a, b);
}

function only<T>(items: T[]): T | null {
  return items.length === 1 ? items[0] : null;
}

// A single token ("Kênia", "Elder Souza") never identifies anyone in a ward of
// two hundred people, so it is never matched. Beyond an exact token-set match,
// one name may extend the other ("Guilherme Vilela Sena" inside "Luiz
// Guilherme Vilela Sena"), but only when exactly one member fits: a guess
// between two people is worse than no match.
export function matchMember(speakerName: string, members: Member[]): Member | null {
  const speaker = new Set(nameTokens(speakerName));
  if (speaker.size < 2) return null;

  const candidates = members.map((member) => ({ member, tokens: new Set(nameTokens(member.fullName)) }));

  const exact = candidates.filter((c) => sameSet(c.tokens, speaker));
  if (exact.length > 0) return only(exact)?.member ?? null;

  const partial = candidates.filter((c) => {
    if (c.tokens.size < 2) return false;
    return c.tokens.size <= speaker.size ? isSubset(c.tokens, speaker) : isSubset(speaker, c.tokens);
  });
  return only(partial)?.member ?? null;
}
