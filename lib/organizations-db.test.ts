import { describe, it, expect, vi, beforeEach } from 'vitest';

// getCallingOrganizationId issues a real SQL query, so the database boundary
// is mocked here rather than exercised against Postgres. Same mocking
// pattern as lib/auth.test.ts: sql.query is replaced with a vi.fn() and its
// resolved rows are asserted against directly.
vi.mock('./db', () => ({
  sql: { query: vi.fn() },
}));

import { hideNames, getCallingOrganizationId } from './organizations-db';
import { sql } from './db';
import type { OrganizationWithCallings } from './types';

const mockQuery = vi.mocked(sql.query);

const orgs: OrganizationWithCallings[] = [
  {
    id: 1,
    key: 'primary',
    displayOrder: 60,
    callings: [
      {
        id: 1,
        title: 'President',
        personId: 7,
        personName: 'Jane Doe',
        personPhotoUrl: 'https://blob.example/jane.jpg',
        displayOrder: 0,
      },
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

  it('removes every person id, so a client component could not leak it in an RSC payload', () => {
    const result = hideNames(orgs);
    for (const calling of result[0].callings) {
      expect(calling.personId).toBeUndefined();
    }
  });

  it('removes every profile photo, following the same rule as the name it sits next to', () => {
    const result = hideNames(orgs);
    for (const calling of result[0].callings) {
      expect(calling.personPhotoUrl).toBeUndefined();
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

describe('getCallingOrganizationId', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns the organization id for an existing calling', async () => {
    mockQuery.mockResolvedValue([{ organization_id: 30 }]);

    await expect(getCallingOrganizationId(5)).resolves.toBe(30);
    expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('FROM callings'), [5]);
  });

  it('returns undefined when the calling does not exist', async () => {
    mockQuery.mockResolvedValue([]);

    await expect(getCallingOrganizationId(999)).resolves.toBeUndefined();
  });
});
