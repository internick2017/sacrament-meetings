import { describe, expect, it } from 'vitest';
import { diffRoster } from './roster-sync';

const current = [
  { id: 1, fullName: 'Ana Souza' },
  { id: 2, fullName: 'Bruno Lima' },
];

describe('diffRoster', () => {
  it('adds only the names that are not in the roster yet', () => {
    expect(diffRoster(current, ['Ana Souza', 'Bruno Lima', 'Carla Dias'])).toEqual({
      toAdd: ['Carla Dias'],
      toRemoveIds: [],
    });
  });

  it('removes only the ids whose name is no longer listed', () => {
    expect(diffRoster(current, ['Ana Souza'])).toEqual({ toAdd: [], toRemoveIds: [2] });
  });

  it('ignores case and surrounding whitespace', () => {
    expect(diffRoster(current, ['  ana souza ', ' BRUNO LIMA	'])).toEqual({
      toAdd: [],
      toRemoveIds: [],
    });
  });

  it('returns nothing to do for the same list', () => {
    expect(diffRoster(current, ['Ana Souza', 'Bruno Lima'])).toEqual({ toAdd: [], toRemoveIds: [] });
  });

  it('does not add the same new name twice', () => {
    expect(diffRoster(current, ['Ana Souza', 'Bruno Lima', 'Carla Dias', 'carla dias'])).toEqual({
      toAdd: ['Carla Dias'],
      toRemoveIds: [],
    });
  });
});

describe('diffRoster keys members by their name tokens', () => {
  const people = [
    { id: 1, fullName: 'João Silva' },
    { id: 2, fullName: 'Maria da Costa' },
  ];

  it('does not remove a member whose accents were fixed or dropped', () => {
    expect(diffRoster(people, ['Joao Silva', 'Maria da Costa'])).toEqual({ toAdd: [], toRemoveIds: [] });
  });

  it('does not remove a member written as "Surname, Given"', () => {
    expect(diffRoster(people, ['Silva, João', 'Costa, Maria'])).toEqual({ toAdd: [], toRemoveIds: [] });
  });

  it('does not add a new name twice when only the word order differs', () => {
    expect(diffRoster(people, ['João Silva', 'Maria da Costa', 'Carla Dias', 'Dias, Carla'])).toEqual({
      toAdd: ['Carla Dias'],
      toRemoveIds: [],
    });
  });

  it('still removes a member whose name tokens are no longer listed', () => {
    expect(diffRoster(people, ['João Silva'])).toEqual({ toAdd: [], toRemoveIds: [2] });
  });
});
