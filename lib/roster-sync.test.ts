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
