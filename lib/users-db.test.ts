import { describe, it, expect, vi, beforeEach } from 'vitest';

// hasRecentVerificationToken issues a real SQL query, so the database
// boundary is mocked here rather than exercised against Postgres. Same
// mocking pattern as lib/organizations-db.test.ts and lib/auth.test.ts.
vi.mock('./db', () => ({
  sql: { query: vi.fn() },
}));

import { hasRecentVerificationToken } from './users-db';
import { sql } from './db';

const mockQuery = vi.mocked(sql.query);

describe('hasRecentVerificationToken', () => {
  beforeEach(() => {
    mockQuery.mockReset();
  });

  it('returns true when a recent, unexpired token row exists for the address', async () => {
    mockQuery.mockResolvedValue([{ '?column?': 1 }]);

    await expect(hasRecentVerificationToken('member@example.com')).resolves.toBe(true);
  });

  it('returns false when no row matches', async () => {
    mockQuery.mockResolvedValue([]);

    await expect(hasRecentVerificationToken('member@example.com')).resolves.toBe(false);
  });

  it('compares case-insensitively, matching the lower(email) index used elsewhere', async () => {
    mockQuery.mockResolvedValue([]);

    await hasRecentVerificationToken('Member@Example.com');

    expect(mockQuery).toHaveBeenCalledWith(
      expect.stringContaining('lower(identifier) = lower($1)'),
      ['Member@Example.com', 60]
    );
  });
});
