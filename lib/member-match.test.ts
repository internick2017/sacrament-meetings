import { describe, it, expect } from 'vitest';
import { matchMember, nameTokens, type Member } from './member-match';

const roster: Member[] = [
  { id: 1, fullName: 'Luiz Guilherme Vilela Sena' },
  { id: 2, fullName: 'Ketlen Dalalba' },
  { id: 3, fullName: 'Carmen Victoria de Silva Larez' },
  { id: 4, fullName: 'Jorge Luis Marcano Quijada Marcano' },
  { id: 5, fullName: 'Sebastian Daniel Lozada Colmenares' },
  { id: 6, fullName: 'Nick Daniel Alejandro Granados Lares' },
  { id: 7, fullName: 'Kenia Souza' },
  { id: 8, fullName: 'Paulo Souza Lima' },
  { id: 9, fullName: 'Ana Maria Costa' },
  { id: 10, fullName: 'Ana Maria Ferreira' },
];

const matchedName = (speaker: string) => matchMember(speaker, roster)?.fullName ?? null;

describe('nameTokens', () => {
  it('drops a trailing role, leading titles, accents and particles', () => {
    expect(nameTokens('Pres. Irmão  José da Silva (bispo)')).toEqual(['jose', 'silva']);
    expect(nameTokens('Élder Souza')).toEqual(['souza']);
  });
});

describe('matchMember', () => {
  it.each([
    ['Guilherme Vilela Sena', 'Luiz Guilherme Vilela Sena'],
    ['Ketlen Dalalba Nunes', 'Ketlen Dalalba'],
    ['Carmen Victoria Silva Larez', 'Carmen Victoria de Silva Larez'],
    ['Jorge Luis Marcano Quijada', 'Jorge Luis Marcano Quijada Marcano'],
    ['Sebastian Lozada', 'Sebastian Daniel Lozada Colmenares'],
    ['Nick Daniel Alejandro Granados Lares (bispo)', 'Nick Daniel Alejandro Granados Lares'],
    ['Kênia Souza', 'Kenia Souza'],
    ['Irmã KÊNIA SOUZA', 'Kenia Souza'],
  ])('matches "%s" to "%s"', (speaker, member) => {
    expect(matchedName(speaker)).toBe(member);
  });

  it('does not match a title plus one name', () => {
    expect(matchedName('Elder Souza')).toBeNull();
  });

  it('does not match a single-token name, even when it equals a token of one member', () => {
    expect(matchedName('Ketlen')).toBeNull();
  });

  it('does not guess when a partial name fits two members', () => {
    expect(matchedName('Ana Maria')).toBeNull();
  });

  it('does not match a name that shares tokens without containing either side', () => {
    expect(matchedName('Paulo Souza Rocha')).toBeNull();
  });

  it('prefers an exact token-set match over a longer name that also contains it', () => {
    const members: Member[] = [
      { id: 1, fullName: 'Ana Maria' },
      { id: 2, fullName: 'Ana Maria Costa' },
    ];
    expect(matchMember('Ana Maria', members)?.id).toBe(1);
  });
});
