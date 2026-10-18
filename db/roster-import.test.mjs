import { describe, it, expect } from 'vitest';
import { planImport } from './roster-import.mjs';

const members = [
  { id: 1, fullName: 'Alvarez Duran, Deivymar Valentina' },
  { id: 2, fullName: 'João Carlos da Silva' },
  { id: 3, fullName: 'Maria Souza Lima' },
  { id: 4, fullName: 'Maria Souza Lima Neto' },
  { id: 5, fullName: 'Pedro Henrique Costa' },
];

describe('planImport', () => {
  it('matches by tokens, ignoring accents and case', () => {
    const plan = planImport([{ name: 'JOAO CARLOS SILVA', phone: '(46) 99999-1234' }], members);
    expect(plan.matched).toEqual([{ memberId: 2, phone: '(46) 99999-1234' }]);
    expect(plan.unmatched).toEqual([]);
    expect(plan.ambiguous).toEqual([]);
  });

  it('ignores the comma of the "Surname, Given" form and the word order', () => {
    const plan = planImport(
      [
        { name: 'Alvarez Duran, Deivymar Valentina' },
        { name: 'Costa, Pedro Henrique' },
      ],
      members
    );
    expect(plan.matched.map((m) => m.memberId)).toEqual([1, 5]);
  });

  it('matches "Given Surname" against a comma-style roster entry', () => {
    const plan = planImport([{ name: 'Deivymar Valentina Alvarez Duran' }], members);
    expect(plan.matched.map((m) => m.memberId)).toEqual([1]);
  });

  it('lists names with no match as unmatched', () => {
    const plan = planImport([{ name: 'Fulano de Tal Inexistente' }], members);
    expect(plan.matched).toEqual([]);
    expect(plan.unmatched).toEqual(['Fulano de Tal Inexistente']);
  });

  it('never matches a single token', () => {
    const plan = planImport([{ name: 'Pedro' }], members);
    expect(plan.unmatched).toEqual(['Pedro']);
  });

  it('refuses an ambiguous partial match', () => {
    const plan = planImport([{ name: 'Maria Souza' }], members);
    expect(plan.matched).toEqual([]);
    expect(plan.unmatched).toEqual(['Maria Souza']);
  });

  it('sends two rows resolving to the same member to ambiguous, applying neither', () => {
    const plan = planImport(
      [
        { name: 'Pedro Henrique Costa', phone: '46 99999-1111' },
        { name: 'Costa, Pedro Henrique', phone: '46 99999-2222' },
        { name: 'João Carlos da Silva' },
      ],
      members
    );
    expect(plan.matched.map((m) => m.memberId)).toEqual([2]);
    expect(plan.ambiguous).toEqual(['Pedro Henrique Costa', 'Costa, Pedro Henrique']);
  });

  it('keeps the trimmed original phone when it is valid', () => {
    const plan = planImport([{ name: 'Pedro Henrique Costa', phone: '  +55 46 99999-1234 ' }], members);
    expect(plan.matched).toEqual([{ memberId: 5, phone: '+55 46 99999-1234' }]);
  });

  it('uses null for an empty, missing or unusable phone', () => {
    const plan = planImport(
      [
        { name: 'Pedro Henrique Costa', phone: '' },
        { name: 'João Carlos da Silva' },
        { name: 'Alvarez Duran, Deivymar Valentina', phone: '123' },
      ],
      members
    );
    expect(plan.matched.map((m) => m.phone)).toEqual([null, null, null]);
  });
});
