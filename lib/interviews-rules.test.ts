import { describe, expect, it } from 'vitest';
import {
  INTERVIEWERS,
  familyStatus,
  findConflicts,
  interviewerAllowedFor,
  lastInterviewed,
  type Interview,
} from './interviews-rules';

let nextId = 1;
function make(over: Partial<Interview> = {}): Interview {
  return {
    id: nextId++,
    memberId: 1,
    kind: 'individual',
    interviewer: 'nick',
    startsAt: '2026-10-20T14:00:00Z',
    durationMinutes: 30,
    mode: 'in_person',
    onlineLink: null,
    status: 'scheduled',
    ...over,
  };
}

describe('INTERVIEWERS', () => {
  it('lists the three interviewers', () => {
    expect(INTERVIEWERS.map((i) => i.key)).toEqual(['nick', 'rafael', 'jared']);
  });
});

describe('interviewerAllowedFor', () => {
  it('allows tithing only with nick', () => {
    expect(interviewerAllowedFor('tithing', 'nick')).toBe(true);
    expect(interviewerAllowedFor('tithing', 'rafael')).toBe(false);
    expect(interviewerAllowedFor('tithing', 'jared')).toBe(false);
  });

  it('allows individual with anyone', () => {
    expect(interviewerAllowedFor('individual', 'rafael')).toBe(true);
    expect(interviewerAllowedFor('individual', 'jared')).toBe(true);
  });
});

describe('findConflicts', () => {
  const existing = make({ startsAt: '2026-10-20T14:00:00Z', durationMinutes: 30 });

  it('flags a candidate that starts inside another interview', () => {
    const c = { interviewer: 'nick' as const, startsAt: '2026-10-20T14:15:00Z', durationMinutes: 30 };
    expect(findConflicts(c, [existing])).toEqual([existing]);
  });

  it('flags a candidate that fully contains another interview', () => {
    const c = { interviewer: 'nick' as const, startsAt: '2026-10-20T13:30:00Z', durationMinutes: 120 };
    expect(findConflicts(c, [existing])).toEqual([existing]);
  });

  it('does not flag contiguous slots (touching is not clashing)', () => {
    const after = { interviewer: 'nick' as const, startsAt: '2026-10-20T14:30:00Z', durationMinutes: 30 };
    const before = { interviewer: 'nick' as const, startsAt: '2026-10-20T13:30:00Z', durationMinutes: 30 };
    expect(findConflicts(after, [existing])).toEqual([]);
    expect(findConflicts(before, [existing])).toEqual([]);
  });

  it('ignores cancelled, rescheduled and done interviews', () => {
    const others = [
      make({ status: 'cancelled' }),
      make({ status: 'rescheduled' }),
      make({ status: 'done' }),
    ];
    const c = { interviewer: 'nick' as const, startsAt: '2026-10-20T14:00:00Z', durationMinutes: 30 };
    expect(findConflicts(c, others)).toEqual([]);
  });

  it('never conflicts with a different interviewer', () => {
    const c = { interviewer: 'rafael' as const, startsAt: '2026-10-20T14:00:00Z', durationMinutes: 30 };
    expect(findConflicts(c, [existing])).toEqual([]);
  });

  it('excludes the interview being edited via ignoreId', () => {
    const c = { interviewer: 'nick' as const, startsAt: '2026-10-20T14:00:00Z', durationMinutes: 30 };
    expect(findConflicts(c, [existing], existing.id)).toEqual([]);
  });
});

describe('familyStatus', () => {
  it('is none without interviews', () => {
    expect(familyStatus([])).toBe('none');
  });

  it('is none when only cancelled or rescheduled remain', () => {
    expect(
      familyStatus([make({ status: 'cancelled' }), make({ status: 'rescheduled' })])
    ).toBe('none');
  });

  it('is done when the latest active interview is done', () => {
    expect(
      familyStatus([
        make({ status: 'scheduled', startsAt: '2026-10-01T14:00:00Z' }),
        make({ status: 'done', startsAt: '2026-10-10T14:00:00Z' }),
        make({ status: 'cancelled', startsAt: '2026-10-20T14:00:00Z' }),
      ])
    ).toBe('done');
  });

  it('is scheduled when the latest active interview is scheduled', () => {
    expect(
      familyStatus([
        make({ status: 'done', startsAt: '2026-10-01T14:00:00Z' }),
        make({ status: 'scheduled', startsAt: '2026-11-01T14:00:00Z' }),
      ])
    ).toBe('scheduled');
  });
});

describe('lastInterviewed', () => {
  it('returns null when nothing is done', () => {
    expect(lastInterviewed([])).toBeNull();
    expect(lastInterviewed([make({ status: 'scheduled' })])).toBeNull();
  });

  it('returns the greatest startsAt among done interviews only', () => {
    expect(
      lastInterviewed([
        make({ status: 'done', startsAt: '2026-01-05T14:00:00Z' }),
        make({ status: 'done', startsAt: '2026-03-05T14:00:00Z' }),
        make({ status: 'scheduled', startsAt: '2026-12-05T14:00:00Z' }),
        make({ status: 'cancelled', startsAt: '2026-11-05T14:00:00Z' }),
      ])
    ).toBe('2026-03-05T14:00:00Z');
  });
});
