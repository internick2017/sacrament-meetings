import { describe, it, expect } from 'vitest';
import { hideNames } from './organizations-db';
import type { OrganizationWithCallings } from './types';

const orgs: OrganizationWithCallings[] = [
  {
    id: 1,
    key: 'primary',
    displayOrder: 60,
    callings: [
      { id: 1, title: 'President', personId: 7, personName: 'Jane Doe', displayOrder: 0 },
      { id: 2, title: 'Counselor', personId: 8, personName: 'John Roe', displayOrder: 1 },
    ],
  },
];

describe('hideNames', () => {
  it('removes every person name', () => {
    const result = hideNames(orgs);
    for (const calling of result[0].callings) {
      expect(calling.personName).toBeUndefined();
    }
  });

  it('keeps the position titles, which are what the public page shows', () => {
    expect(hideNames(orgs)[0].callings.map((c) => c.title)).toEqual(['President', 'Counselor']);
  });

  it('does not mutate the input', () => {
    hideNames(orgs);
    expect(orgs[0].callings[0].personName).toBe('Jane Doe');
  });

  it('leaves an organization with no callings alone', () => {
    const empty: OrganizationWithCallings[] = [
      { id: 2, key: 'bishopric', displayOrder: 10, callings: [] },
    ];
    expect(hideNames(empty)).toEqual(empty);
  });
});
