import { describe, it, expect, vi, beforeEach } from 'vitest';

// The SQL these functions build is the behaviour under test, so the db
// boundary (sql.query / sql.transaction) is mocked and the text and params it
// receives are inspected, the same way announcements-db.test.ts does it.
vi.mock('./db', () => ({
  sql: {
    query: vi.fn().mockResolvedValue([]),
    transaction: vi.fn(),
  },
}));

import { sql } from './db';
import {
  listInterviewBoard,
  insertInterview,
  setInterviewStatus,
  setMemberPhone,
  listScheduledFor,
  getInterview,
  rescheduleInterview,
  isActiveTithingConflict,
} from './interviews-db';

const mockQuery = vi.mocked(sql.query);
const mockTransaction = vi.mocked(sql.transaction);

const interviewRow = {
  id: 5,
  member_id: 1,
  kind: 'tithing',
  interviewer: 'nick',
  starts_at: '2026-10-25T17:00:00.000Z',
  duration_minutes: 30,
  mode: 'in_person',
  online_link: null,
  status: 'scheduled',
};

const newInterview = {
  memberId: 1,
  kind: 'individual' as const,
  interviewer: 'jared' as const,
  startsAt: '2026-10-25T17:00:00.000Z',
  durationMinutes: 45,
  mode: 'online' as const,
  onlineLink: 'https://meet.google.com/abc',
};

describe('listInterviewBoard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reads members and their interviews in one query, starts_at as UTC ISO text', async () => {
    await listInterviewBoard();

    expect(mockQuery).toHaveBeenCalledTimes(1);
    const [query] = mockQuery.mock.calls[0];
    expect(query).toContain('FROM members');
    expect(query).toContain('LEFT JOIN interviews');
    expect(query).toContain(`to_char(i.starts_at AT TIME ZONE 'UTC'`);
  });

  it('groups rows per member, maps interviews, and sorts by name', async () => {
    mockQuery.mockResolvedValueOnce([
      { member_id: 2, full_name: 'Zélia Souza', phone: null, is_head: false, ...nullInterview() },
      { ...interviewRow, full_name: 'Ana Lima', phone: '46 99999-8888', is_head: true, id: 5 },
      {
        ...interviewRow,
        full_name: 'Ana Lima',
        phone: '46 99999-8888',
        is_head: true,
        id: 6,
        status: 'done',
      },
    ]);

    const board = await listInterviewBoard();

    expect(board).toEqual([
      {
        member: { id: 1, fullName: 'Ana Lima', phone: '46 99999-8888', isHead: true },
        interviews: [
          {
            id: 5,
            memberId: 1,
            kind: 'tithing',
            interviewer: 'nick',
            startsAt: '2026-10-25T17:00:00.000Z',
            durationMinutes: 30,
            mode: 'in_person',
            onlineLink: null,
            status: 'scheduled',
          },
          expect.objectContaining({ id: 6, status: 'done' }),
        ],
      },
      { member: { id: 2, fullName: 'Zélia Souza', phone: null, isHead: false }, interviews: [] },
    ]);
  });
});

function nullInterview() {
  return {
    id: null,
    kind: null,
    interviewer: null,
    starts_at: null,
    duration_minutes: null,
    mode: null,
    online_link: null,
    status: null,
  };
}

describe('insertInterview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('inserts a scheduled interview and returns its id', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 42 }]);

    const id = await insertInterview(newInterview, 3);

    expect(id).toBe(42);
    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain('INSERT INTO interviews');
    expect(query).toContain(`'scheduled'`);
    expect(query).toContain('RETURNING id');
    expect(params).toEqual([
      1,
      'individual',
      'jared',
      '2026-10-25T17:00:00.000Z',
      45,
      'online',
      'https://meet.google.com/abc',
      3,
    ]);
  });
});

describe('setInterviewStatus / setMemberPhone', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the status only of a row that is still scheduled', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 5 }]);

    expect(await setInterviewStatus(5, 'done')).toBe(true);

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain('UPDATE interviews SET status = $1');
    expect(query).toContain(`AND status = 'scheduled'`);
    expect(query).toContain('RETURNING id');
    expect(params).toEqual(['done', 5]);
  });

  it('returns false when no scheduled row matched', async () => {
    mockQuery.mockResolvedValueOnce([]);

    expect(await setInterviewStatus(5, 'cancelled')).toBe(false);
  });

  it('sets or clears a member phone', async () => {
    await setMemberPhone(1, '46 99999-8888');
    await setMemberPhone(1, null);

    expect(mockQuery.mock.calls[0][0]).toContain('UPDATE members SET phone = $1');
    expect(mockQuery.mock.calls[0][1]).toEqual(['46 99999-8888', 1]);
    expect(mockQuery.mock.calls[1][1]).toEqual([null, 1]);
  });
});

describe('listScheduledFor / getInterview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists only the scheduled interviews of one interviewer', async () => {
    mockQuery.mockResolvedValueOnce([interviewRow]);

    const list = await listScheduledFor('nick');

    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toContain(`status = 'scheduled'`);
    expect(query).toContain('interviewer = $1');
    expect(params).toEqual(['nick']);
    expect(list).toEqual([expect.objectContaining({ id: 5, startsAt: '2026-10-25T17:00:00.000Z' })]);
  });

  it('gets one interview, or undefined when missing', async () => {
    mockQuery.mockResolvedValueOnce([interviewRow]);
    expect(await getInterview(5)).toEqual(expect.objectContaining({ id: 5, memberId: 1 }));
    expect(mockQuery.mock.calls[0][1]).toEqual([5]);

    mockQuery.mockResolvedValueOnce([]);
    expect(await getInterview(99)).toBeUndefined();
  });
});

describe('rescheduleInterview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moves the old row and inserts the new one in ONE statement guarded by the move', async () => {
    mockQuery.mockResolvedValueOnce([{ id: 77 }]);

    const id = await rescheduleInterview(5, newInterview, 3);

    expect(id).toBe(77);
    expect(mockQuery).toHaveBeenCalledTimes(1);
    expect(mockTransaction).not.toHaveBeenCalled();
    const [query, params] = mockQuery.mock.calls[0];
    expect(query).toMatch(/WITH moved AS \(\s*UPDATE interviews SET status = 'rescheduled'/);
    expect(query).toContain(`WHERE id = $1 AND status = 'scheduled'`);
    expect(query).toContain('INSERT INTO interviews');
    expect(query).toContain('WHERE EXISTS (SELECT 1 FROM moved)');
    expect(params).toEqual([
      5,
      1,
      'individual',
      'jared',
      '2026-10-25T17:00:00.000Z',
      45,
      'online',
      'https://meet.google.com/abc',
      3,
    ]);
  });

  it('returns null when the old row was no longer scheduled (nothing inserted)', async () => {
    mockQuery.mockResolvedValueOnce([]);

    expect(await rescheduleInterview(5, newInterview, 3)).toBeNull();
  });
});

describe('isActiveTithingConflict', () => {
  it('recognises only a unique violation on the one-active-tithing index', () => {
    const index = 'interviews_one_active_tithing_idx';
    expect(isActiveTithingConflict({ code: '23505', constraint: index })).toBe(true);
    expect(isActiveTithingConflict({ code: '23505', constraint: 'members_full_name_lower_idx' })).toBe(false);
    expect(isActiveTithingConflict({ code: '23503', constraint: index })).toBe(false);
    expect(isActiveTithingConflict(new Error('x'))).toBe(false);
    expect(isActiveTithingConflict(null)).toBe(false);
  });
});
