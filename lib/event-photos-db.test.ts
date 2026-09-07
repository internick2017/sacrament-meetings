import { describe, it, expect, vi, beforeEach } from 'vitest';

// getEventPhotos's approved-only default is the last line of defense
// against an unapproved photo of a child reaching every signed-in member: a
// forgetful call site that omits `includeUnapproved` must still only see
// approved rows. The only honest way to test that default without a real
// database is to mock the db boundary (sql.query) and inspect the SQL text
// it was called with, the same pattern as announcements-db.test.ts pins
// includeExpired.
vi.mock('./db', () => ({
  sql: { query: vi.fn().mockResolvedValue([]) },
}));

describe('getEventPhotos query composition', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('filters to approved photos by default (options omitted)', async () => {
    const { sql } = await import('./db');
    const { getEventPhotos } = await import('./event-photos-db');

    await getEventPhotos(1);

    const [query, params] = vi.mocked(sql.query).mock.calls[0];
    expect(query).toContain('p.approved = TRUE');
    expect(params).toEqual([1]);
  });

  it('filters to approved photos when options is an empty object', async () => {
    const { sql } = await import('./db');
    const { getEventPhotos } = await import('./event-photos-db');

    await getEventPhotos(2, {});

    const [query] = vi.mocked(sql.query).mock.calls[0];
    expect(query).toContain('p.approved = TRUE');
  });

  it('filters to approved photos when includeUnapproved is explicitly false', async () => {
    const { sql } = await import('./db');
    const { getEventPhotos } = await import('./event-photos-db');

    await getEventPhotos(3, { includeUnapproved: false });

    const [query] = vi.mocked(sql.query).mock.calls[0];
    expect(query).toContain('p.approved = TRUE');
  });

  it('omits the approved filter only when includeUnapproved is explicitly true', async () => {
    const { sql } = await import('./db');
    const { getEventPhotos } = await import('./event-photos-db');

    await getEventPhotos(4, { includeUnapproved: true });

    const [query, params] = vi.mocked(sql.query).mock.calls[0];
    expect(query).not.toContain('p.approved = TRUE');
    expect(params).toEqual([4]);
  });
});
