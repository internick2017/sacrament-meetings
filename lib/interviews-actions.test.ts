import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return { requireInterviewAccess: vi.fn(), NotAuthorizedError };
});
// The real isActiveTithingConflict is kept (it is a pure error check); the
// db client itself is mocked so importing the module needs no database.
vi.mock('./db', () => ({ sql: {} }));
vi.mock('./interviews-db', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./interviews-db')>()),
  listInterviewBoard: vi.fn(),
  insertInterview: vi.fn(),
  setInterviewStatus: vi.fn(),
  setMemberPhone: vi.fn(),
  listScheduledFor: vi.fn(),
  getInterview: vi.fn(),
  rescheduleInterview: vi.fn(),
}));
vi.mock('./unit-db', () => ({
  getUnit: vi.fn().mockResolvedValue({ timezone: 'America/Sao_Paulo' }),
}));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));

import { requireInterviewAccess, NotAuthorizedError } from './authz';
import * as db from './interviews-db';
import type { Interview } from './interviews-rules';
import type { BoardRow } from './interviews-db';
import {
  scheduleInterviewAction,
  rescheduleInterviewAction,
  markInterviewDoneAction,
  cancelInterviewAction,
  savePhoneAction,
} from './interviews-actions';

const mockAccess = vi.mocked(requireInterviewAccess);
const mockBoard = vi.mocked(db.listInterviewBoard);
const mockInsert = vi.mocked(db.insertInterview);
const mockSetStatus = vi.mocked(db.setInterviewStatus);
const mockSetPhone = vi.mocked(db.setMemberPhone);
const mockScheduled = vi.mocked(db.listScheduledFor);
const mockGet = vi.mocked(db.getInterview);
const mockReschedule = vi.mocked(db.rescheduleInterview);

function interview(overrides: Partial<Interview> = {}): Interview {
  return {
    id: 5,
    memberId: 12,
    kind: 'tithing',
    interviewer: 'nick',
    startsAt: '2026-10-25T17:00:00.000Z',
    durationMinutes: 30,
    mode: 'in_person',
    onlineLink: null,
    status: 'scheduled',
    ...overrides,
  };
}

function boardWith(interviews: Interview[] = []): BoardRow[] {
  return [
    { member: { id: 12, fullName: 'Ana Lima', phone: null, isHead: true }, interviews },
  ];
}

function form(fields: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) fd.set(key, value);
  return fd;
}

const scheduleFields = {
  memberId: '12',
  kind: 'tithing',
  interviewer: 'nick',
  startsLocal: '2026-10-25T14:00',
  durationMinutes: '30',
  mode: 'in_person',
  onlineLink: '',
  phone: '',
};

function expectNoDbCalls() {
  for (const fn of [mockBoard, mockInsert, mockSetStatus, mockSetPhone, mockScheduled, mockGet, mockReschedule]) {
    expect(fn).not.toHaveBeenCalled();
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  mockAccess.mockResolvedValue({ id: '3', role: 'secretary', organizationId: null });
  mockBoard.mockResolvedValue(boardWith());
  mockScheduled.mockResolvedValue([]);
  mockInsert.mockResolvedValue(99);
  mockReschedule.mockResolvedValue(100);
  mockGet.mockResolvedValue(interview());
  mockSetStatus.mockResolvedValue(true);
});

// What the Neon driver throws when the one-active-tithing index refuses a row.
function activeTithingViolation() {
  return Object.assign(new Error('duplicate key value violates unique constraint'), {
    code: '23505',
    constraint: 'interviews_one_active_tithing_idx',
  });
}

describe('every interview action refuses a role without interview access', () => {
  const cases: [string, (fd: FormData) => Promise<{ message?: string }>][] = [
    ['schedule', (fd) => scheduleInterviewAction({}, fd)],
    ['reschedule', (fd) => rescheduleInterviewAction({}, fd)],
    ['done', (fd) => markInterviewDoneAction({}, fd)],
    ['cancel', (fd) => cancelInterviewAction({}, fd)],
    ['phone', (fd) => savePhoneAction({}, fd)],
  ];

  for (const [name, run] of cases) {
    it(`${name}: returns admin.notAllowed without touching the database`, async () => {
      mockAccess.mockRejectedValue(new NotAuthorizedError());

      const state = await run(form({ ...scheduleFields, id: '5', phone: '46999998888' }));

      expect(state.message).toBe('admin.notAllowed');
      expectNoDbCalls();
    });
  }
});

describe('scheduleInterviewAction', () => {
  it('rejects a tithing interview assigned to Rafael, even for the secretary', async () => {
    const state = await scheduleInterviewAction({}, form({ ...scheduleFields, interviewer: 'rafael' }));

    expect(state.errors?.interviewer).toEqual(['validation.interview.tithingOnlyNick']);
    expect(state.values?.interviewer).toBe('rafael');
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('stores the local Sao Paulo time as the matching UTC instant', async () => {
    const state = await scheduleInterviewAction({}, form(scheduleFields));

    expect(state.saved).toBe(true);
    expect(mockInsert).toHaveBeenCalledWith(
      {
        memberId: 12,
        kind: 'tithing',
        interviewer: 'nick',
        startsAt: '2026-10-25T17:00:00.000Z',
        durationMinutes: 30,
        mode: 'in_person',
        onlineLink: null,
      },
      3
    );
  });

  it('rejects an unparsable date before looking for conflicts', async () => {
    const state = await scheduleInterviewAction({}, form({ ...scheduleFields, startsLocal: 'soon' }));

    expect(state.errors?.startsLocal).toEqual(['validation.interview.startsAt']);
    expect(mockScheduled).not.toHaveBeenCalled();
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('rejects an online interview without a link', async () => {
    const state = await scheduleInterviewAction({}, form({ ...scheduleFields, mode: 'online' }));

    expect(state.errors?.onlineLink).toEqual(['validation.interview.onlineLinkRequired']);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('saves even when it overlaps, and returns the conflicts', async () => {
    const clash = interview({ id: 8, memberId: 40, kind: 'individual', startsAt: '2026-10-25T17:15:00.000Z' });
    mockScheduled.mockResolvedValue([clash]);

    const state = await scheduleInterviewAction({}, form(scheduleFields));

    expect(mockScheduled).toHaveBeenCalledWith('nick');
    expect(mockInsert).toHaveBeenCalledTimes(1);
    expect(state.saved).toBe(true);
    expect(state.conflicts).toEqual([clash]);
    expect(state.message).toBe('interviews.savedWithConflicts');
  });

  it('returns no conflicts when the slot is free', async () => {
    const state = await scheduleInterviewAction({}, form(scheduleFields));

    expect(state.conflicts).toEqual([]);
    expect(state.message).toBe('interviews.saved');
  });

  it('rejects a second scheduled tithing interview for the same family', async () => {
    mockBoard.mockResolvedValue(boardWith([interview({ id: 2 })]));

    const state = await scheduleInterviewAction({}, form(scheduleFields));

    expect(state.errors?.memberId).toEqual(['validation.interview.tithingAlreadyScheduled']);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('allows a new tithing interview when the previous one is done or cancelled', async () => {
    mockBoard.mockResolvedValue(
      boardWith([interview({ id: 2, status: 'done' }), interview({ id: 3, status: 'cancelled' })])
    );

    const state = await scheduleInterviewAction({}, form(scheduleFields));

    expect(state.saved).toBe(true);
  });

  it('maps a unique violation from a racing save to the tithing-already-scheduled message', async () => {
    mockInsert.mockRejectedValue(activeTithingViolation());

    const state = await scheduleInterviewAction({}, form({ ...scheduleFields, phone: '46999998888' }));

    expect(state.saved).toBeUndefined();
    expect(state.errors?.memberId).toEqual(['validation.interview.tithingAlreadyScheduled']);
    expect(mockSetPhone).not.toHaveBeenCalled();
  });

  it('rethrows any other database error', async () => {
    mockInsert.mockRejectedValue(
      Object.assign(new Error('boom'), { code: '23505', constraint: 'other_idx' })
    );

    await expect(scheduleInterviewAction({}, form(scheduleFields))).rejects.toThrow('boom');
  });

  it('rejects a tithing interview for a member who is not a head of family', async () => {
    mockBoard.mockResolvedValue([
      { member: { id: 12, fullName: 'Ana Lima', phone: null, isHead: false }, interviews: [] },
    ]);

    const state = await scheduleInterviewAction({}, form(scheduleFields));

    expect(state.saved).toBeUndefined();
    expect(state.errors?.kind).toEqual(['validation.interview.tithingNeedsHead']);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('allows a tithing interview for a head of family', async () => {
    const state = await scheduleInterviewAction({}, form(scheduleFields));

    expect(state.saved).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('allows an individual interview for a member who is not a head of family', async () => {
    mockBoard.mockResolvedValue([
      { member: { id: 12, fullName: 'Ana Lima', phone: null, isHead: false }, interviews: [] },
    ]);

    const state = await scheduleInterviewAction(
      {},
      form({ ...scheduleFields, kind: 'individual', interviewer: 'rafael' })
    );

    expect(state.saved).toBe(true);
    expect(mockInsert).toHaveBeenCalledTimes(1);
  });

  it('rejects a member that is not on the roster', async () => {
    mockBoard.mockResolvedValue([]);

    const state = await scheduleInterviewAction({}, form(scheduleFields));

    expect(state.errors?.memberId).toEqual(['validation.interview.memberNotFound']);
    expect(mockInsert).not.toHaveBeenCalled();
  });

  it('stores a usable phone as typed, and ignores an unusable one', async () => {
    await scheduleInterviewAction({}, form({ ...scheduleFields, phone: ' (46) 99999-8888 ' }));
    expect(mockSetPhone).toHaveBeenCalledWith(12, '(46) 99999-8888');

    mockSetPhone.mockClear();
    const unusable = await scheduleInterviewAction({}, form({ ...scheduleFields, phone: '123' }));
    expect(mockSetPhone).not.toHaveBeenCalled();
    expect(unusable.saved).toBe(true);
    expect(unusable.phoneWarning).toBe('interviews.phoneNotSaved');

    const empty = await scheduleInterviewAction({}, form(scheduleFields));
    expect(mockSetPhone).not.toHaveBeenCalled();
    expect(empty.phoneWarning).toBeUndefined();
  });
});

describe('rescheduleInterviewAction', () => {
  const rescheduleFields = {
    id: '5',
    interviewer: 'nick',
    startsLocal: '2026-10-26T09:30',
    durationMinutes: '30',
    mode: 'online',
    onlineLink: 'https://meet.google.com/abc',
  };

  it('goes through the single transaction path, keeping member and kind of the old row', async () => {
    const state = await rescheduleInterviewAction(
      {},
      form({ ...rescheduleFields, memberId: '999', kind: 'individual' })
    );

    expect(state.saved).toBe(true);
    expect(mockReschedule).toHaveBeenCalledWith(
      5,
      {
        memberId: 12,
        kind: 'tithing',
        interviewer: 'nick',
        startsAt: '2026-10-26T12:30:00.000Z',
        durationMinutes: 30,
        mode: 'online',
        onlineLink: 'https://meet.google.com/abc',
      },
      3
    );
    expect(mockInsert).not.toHaveBeenCalled();
    expect(mockSetStatus).not.toHaveBeenCalled();
  });

  it('applies the same rules: a tithing interview cannot move to Rafael', async () => {
    const state = await rescheduleInterviewAction({}, form({ ...rescheduleFields, interviewer: 'rafael' }));

    expect(state.errors?.interviewer).toEqual(['validation.interview.tithingOnlyNick']);
    expect(mockReschedule).not.toHaveBeenCalled();
  });

  it('does not count the interview being moved as a conflict with itself', async () => {
    mockScheduled.mockResolvedValue([interview({ startsAt: '2026-10-26T12:30:00.000Z' })]);

    const state = await rescheduleInterviewAction({}, form(rescheduleFields));

    expect(state.conflicts).toEqual([]);
  });

  it('reports not-scheduled, not success, when the row was closed meanwhile (0 rows moved)', async () => {
    mockReschedule.mockResolvedValue(null);

    const state = await rescheduleInterviewAction({}, form({ ...rescheduleFields, phone: '46999998888' }));

    expect(state.message).toBe('interviews.notScheduled');
    expect(state.saved).toBeUndefined();
    expect(mockSetPhone).not.toHaveBeenCalled();
  });

  it('maps a unique violation to the tithing-already-scheduled message', async () => {
    mockReschedule.mockRejectedValue(activeTithingViolation());

    const state = await rescheduleInterviewAction({}, form(rescheduleFields));

    expect(state.errors?.memberId).toEqual(['validation.interview.tithingAlreadyScheduled']);
    expect(state.saved).toBeUndefined();
  });

  it('only reschedules an interview that is still scheduled', async () => {
    mockGet.mockResolvedValue(interview({ status: 'done' }));

    const state = await rescheduleInterviewAction({}, form(rescheduleFields));

    expect(state.message).toBe('interviews.notScheduled');
    expect(mockReschedule).not.toHaveBeenCalled();
  });
});

describe('markInterviewDoneAction / cancelInterviewAction', () => {
  it('marks a scheduled interview done', async () => {
    const state = await markInterviewDoneAction({}, form({ id: '5' }));

    expect(mockSetStatus).toHaveBeenCalledWith(5, 'done');
    expect(state.saved).toBe(true);
  });

  it('cancels a scheduled interview', async () => {
    const state = await cancelInterviewAction({}, form({ id: '5' }));

    expect(mockSetStatus).toHaveBeenCalledWith(5, 'cancelled');
    expect(state.saved).toBe(true);
  });

  it('reports not-scheduled when the guarded update matched no row (already closed)', async () => {
    mockSetStatus.mockResolvedValue(false);

    const cancelled = await cancelInterviewAction({}, form({ id: '5' }));
    const done = await markInterviewDoneAction({}, form({ id: '5' }));

    expect(cancelled).toEqual({ message: 'interviews.notScheduled' });
    expect(done).toEqual({ message: 'interviews.notScheduled' });
  });

  it('rejects a missing or invalid id', async () => {
    const state = await cancelInterviewAction({}, form({ id: 'abc' }));

    expect(state.message).toBe('validation.interview.invalidId');
    expect(mockSetStatus).not.toHaveBeenCalled();
  });
});

describe('savePhoneAction', () => {
  it('saves the phone as typed', async () => {
    const state = await savePhoneAction({}, form({ memberId: '12', phone: ' 46 99999-8888 ' }));

    expect(mockSetPhone).toHaveBeenCalledWith(12, '46 99999-8888');
    expect(state.saved).toBe(true);
  });

  it('clears the phone with an empty string', async () => {
    await savePhoneAction({}, form({ memberId: '12', phone: '  ' }));

    expect(mockSetPhone).toHaveBeenCalledWith(12, null);
  });

  it('rejects a phone that cannot become a WhatsApp number', async () => {
    const state = await savePhoneAction({}, form({ memberId: '12', phone: '123' }));

    expect(state.errors?.phone).toEqual(['validation.interview.phone']);
    expect(mockSetPhone).not.toHaveBeenCalled();
  });
});
