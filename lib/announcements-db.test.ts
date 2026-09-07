import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currentFilter } from './announcements-db';

// getAnnouncementById's includeExpired handling lives in the query it builds,
// not in a standalone function, so the only honest way to test it without a
// real database is to mock the db boundary (sql.query) and inspect the SQL
// text it was called with. This does not mock the function under test.
vi.mock('./db', () => ({
  sql: { query: vi.fn().mockResolvedValue([]) },
}));

describe('getAnnouncementById query composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies currentFilter by default (includeExpired omitted)', async () => {
    const { sql } = await import('./db');
    const { getAnnouncementById } = await import('./announcements-db');

    await getAnnouncementById({ id: 1, signedIn: true });

    const [query] = vi.mocked(sql.query).mock.calls[0];
    expect(query).toContain('ends_on >= CURRENT_DATE');
  });

  it('applies currentFilter when includeExpired is explicitly false', async () => {
    const { sql } = await import('./db');
    const { getAnnouncementById } = await import('./announcements-db');

    await getAnnouncementById({ id: 1, signedIn: true, includeExpired: false });

    const [query] = vi.mocked(sql.query).mock.calls[0];
    expect(query).toContain('ends_on >= CURRENT_DATE');
  });

  it('omits currentFilter when includeExpired is true (admin edit/delete path)', async () => {
    const { sql } = await import('./db');
    const { getAnnouncementById } = await import('./announcements-db');

    await getAnnouncementById({ id: 1, signedIn: true, includeExpired: true });

    const [query] = vi.mocked(sql.query).mock.calls[0];
    expect(query).not.toContain('ends_on >= CURRENT_DATE');
  });
});

describe('currentFilter', () => {
  it('excludes announcements that have already expired', () => {
    expect(currentFilter()).toContain('ends_on >= CURRENT_DATE');
  });

  it('excludes announcements that have not started yet', () => {
    expect(currentFilter()).toContain('starts_on');
    expect(currentFilter()).toContain('CURRENT_DATE');
  });

  // The filter is concatenated into SQL, so it must never be able to carry a
  // value. It takes no arguments and returns a constant.
  it('takes no arguments and returns a constant string', () => {
    expect(currentFilter.length).toBe(0);
    expect(currentFilter()).toBe(currentFilter());
    expect(currentFilter()).not.toMatch(/[$;]/);
  });
});
