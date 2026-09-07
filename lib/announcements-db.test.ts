import { describe, it, expect, vi, beforeEach } from 'vitest';
import { currentFilter } from './announcements-db';

// getAnnouncementById's includeExpired handling lives in the query it builds,
// not in a standalone function, so the only honest way to test it without a
// real database is to mock the db boundary (sql.query) and inspect the SQL
// text and params it was called with. This does not mock the function under
// test.
vi.mock('./db', () => ({
  sql: { query: vi.fn().mockResolvedValue([]) },
}));

// getUnit is mocked too, since currentFilter's date now comes from the
// congregation's timezone (via getUnit + todayInTimeZone) rather than from
// Postgres CURRENT_DATE.
vi.mock('./unit-db', () => ({
  getUnit: vi.fn().mockResolvedValue({ timezone: 'America/Sao_Paulo' }),
}));

describe('getAnnouncementById query composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('applies currentFilter by default (includeExpired omitted)', async () => {
    const { sql } = await import('./db');
    const { getAnnouncementById } = await import('./announcements-db');

    await getAnnouncementById({ id: 1, signedIn: true });

    const [query, params] = vi.mocked(sql.query).mock.calls[0];
    expect(query).toContain('ends_on >= $2::date');
    expect(params).toHaveLength(2);
    expect(params?.[1]).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('applies currentFilter when includeExpired is explicitly false', async () => {
    const { sql } = await import('./db');
    const { getAnnouncementById } = await import('./announcements-db');

    await getAnnouncementById({ id: 1, signedIn: true, includeExpired: false });

    const [query, params] = vi.mocked(sql.query).mock.calls[0];
    expect(query).toContain('ends_on >= $2::date');
    expect(params).toHaveLength(2);
  });

  it('omits currentFilter when includeExpired is true (admin edit/delete path)', async () => {
    const { sql } = await import('./db');
    const { getAnnouncementById } = await import('./announcements-db');

    await getAnnouncementById({ id: 1, signedIn: true, includeExpired: true });

    const [query, params] = vi.mocked(sql.query).mock.calls[0];
    expect(query).not.toContain('::date');
    expect(params).toHaveLength(1);
  });
});

describe('getAnnouncements query composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('parameterises the date placeholder after organizationId', async () => {
    const { sql } = await import('./db');
    const { getAnnouncements } = await import('./announcements-db');

    await getAnnouncements({ signedIn: true, organizationId: 3 });

    const [query, params] = vi.mocked(sql.query).mock.calls[0];
    expect(query).toContain('ends_on >= $2::date');
    expect(params).toEqual([3, expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/)]);
  });
});

describe('currentFilter', () => {
  it('excludes announcements that have already expired', () => {
    expect(currentFilter(1)).toContain('ends_on >= $1::date');
  });

  it('excludes announcements that have not started yet', () => {
    expect(currentFilter(1)).toContain('starts_on');
    expect(currentFilter(1)).toContain('$1::date');
  });

  // The filter is concatenated into SQL, so it must never be able to carry a
  // VALUE. It takes only a placeholder index (a number chosen by the
  // caller); the date itself always travels through the parameter array.
  it('takes a placeholder index and returns a string containing only that placeholder', () => {
    expect(currentFilter.length).toBe(1);
    expect(currentFilter(3)).toContain('$3');
    expect(currentFilter(3)).not.toContain('$1');
    expect(currentFilter(3)).not.toMatch(/[^$]\d{4}-\d{2}-\d{2}/);
  });
});
