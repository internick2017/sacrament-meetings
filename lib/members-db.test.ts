import { describe, it, expect, vi, beforeEach } from 'vitest';

// replaceMembers' guarantee lives in the statements it hands to the database,
// so the db boundary (sql) is mocked and the calls are inspected.
vi.mock('./db', () => ({
  sql: {
    query: vi.fn((text: string) => ({ text })),
    transaction: vi.fn().mockResolvedValue([]),
  },
}));

import { sql } from './db';
import { removedMembersWithData, replaceMembers } from './members-db';

describe('replaceMembers', () => {
  beforeEach(() => vi.clearAllMocks());

  it('deletes then inserts in one transaction', async () => {
    await replaceMembers({ toAdd: ['Carla Dias'], toRemoveIds: [2, 3] });

    expect(sql.transaction).toHaveBeenCalledTimes(1);
    const statements = vi.mocked(sql.transaction).mock.calls[0][0] as unknown as { text: string }[];
    expect(statements).toHaveLength(2);
    expect(statements[0].text).toMatch(/^DELETE FROM members/);
    expect(statements[1].text).toMatch(/^INSERT INTO members/);
    expect(vi.mocked(sql.query).mock.calls[0][1]).toEqual([[2, 3]]);
    expect(vi.mocked(sql.query).mock.calls[1][1]).toEqual([['Carla Dias']]);
  });

  it('writes nothing when there is nothing to change', async () => {
    await replaceMembers({ toAdd: [], toRemoveIds: [] });
    expect(sql.transaction).not.toHaveBeenCalled();
  });
});

describe('removedMembersWithData', () => {
  beforeEach(() => vi.clearAllMocks());

  it('asks in one query for the removed members that carry data, returning names', async () => {
    vi.mocked(sql.query).mockResolvedValueOnce([{ full_name: 'Ana Souza' }] as never);

    expect(await removedMembersWithData([4, 5])).toEqual(['Ana Souza']);
    expect(sql.query).toHaveBeenCalledTimes(1);
    const [text, params] = vi.mocked(sql.query).mock.calls[0];
    expect(text).toContain('is_head');
    expect(text).toContain('phone');
    expect(text).toContain('interviews');
    expect(params).toEqual([[4, 5]]);
  });

  it('skips the query when nobody is removed', async () => {
    expect(await removedMembersWithData([])).toEqual([]);
    expect(sql.query).not.toHaveBeenCalled();
  });
});
