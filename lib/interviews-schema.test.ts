import { describe, it, expect } from 'vitest';
import { interviewFormSchema } from './interviews-schema';

const t = ((key: string) => key) as never;

const valid = {
  memberId: '12',
  kind: 'tithing',
  interviewer: 'nick',
  startsLocal: '2026-10-25T14:00',
  durationMinutes: '30',
  mode: 'in_person',
  onlineLink: '',
  phone: '',
};

function issuesFor(input: Record<string, string>) {
  const result = interviewFormSchema(t).safeParse(input);
  expect(result.success).toBe(false);
  return result.error!.issues.map((issue) => ({ path: issue.path, message: issue.message }));
}

describe('interviewFormSchema', () => {
  it('accepts a tithing interview with Nick, in person', () => {
    const result = interviewFormSchema(t).safeParse(valid);
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      memberId: 12,
      kind: 'tithing',
      interviewer: 'nick',
      startsLocal: '2026-10-25T14:00',
      durationMinutes: 30,
      mode: 'in_person',
      onlineLink: null,
      phone: '',
    });
  });

  it('accepts an individual interview with a counselor', () => {
    const result = interviewFormSchema(t).safeParse({
      ...valid,
      kind: 'individual',
      interviewer: 'rafael',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a tithing interview with anyone but Nick', () => {
    expect(issuesFor({ ...valid, interviewer: 'rafael' })).toEqual([
      { path: ['interviewer'], message: 'validation.interview.tithingOnlyNick' },
    ]);
    expect(issuesFor({ ...valid, interviewer: 'jared' })[0].path).toEqual(['interviewer']);
  });

  it('rejects an unknown kind, interviewer or mode', () => {
    expect(issuesFor({ ...valid, kind: 'other' })[0].path).toEqual(['kind']);
    expect(issuesFor({ ...valid, interviewer: 'someone' })[0].path).toEqual(['interviewer']);
    expect(issuesFor({ ...valid, mode: 'phone' })[0].path).toEqual(['mode']);
  });

  it('requires a positive member id', () => {
    expect(issuesFor({ ...valid, memberId: '' })[0].path).toEqual(['memberId']);
    expect(issuesFor({ ...valid, memberId: 'abc' })[0].path).toEqual(['memberId']);
    expect(issuesFor({ ...valid, memberId: '-3' })[0].path).toEqual(['memberId']);
  });

  it('requires an online link when the interview is online', () => {
    expect(issuesFor({ ...valid, mode: 'online', onlineLink: '   ' })).toEqual([
      { path: ['onlineLink'], message: 'validation.interview.onlineLinkRequired' },
    ]);
  });

  it('keeps the link for online and drops it for in person', () => {
    const online = interviewFormSchema(t).safeParse({
      ...valid,
      mode: 'online',
      onlineLink: ' https://meet.google.com/abc ',
    });
    expect(online.data?.onlineLink).toBe('https://meet.google.com/abc');

    const inPerson = interviewFormSchema(t).safeParse({
      ...valid,
      onlineLink: 'https://meet.google.com/abc',
    });
    expect(inPerson.data?.onlineLink).toBeNull();
  });

  it('rejects an unparsable or impossible date and time', () => {
    for (const startsLocal of ['', 'tomorrow', '2026-10-25', '2026-13-01T10:00', '2026-02-30T10:00', '2026-10-25T25:00']) {
      expect(issuesFor({ ...valid, startsLocal })).toEqual([
        { path: ['startsLocal'], message: 'validation.interview.startsAt' },
      ]);
    }
  });

  it('accepts a datetime-local value with seconds', () => {
    expect(
      interviewFormSchema(t).safeParse({ ...valid, startsLocal: '2026-10-25T14:00:00' }).success
    ).toBe(true);
  });

  it('defaults the duration to 30 minutes and bounds it to 1-240', () => {
    expect(interviewFormSchema(t).safeParse({ ...valid, durationMinutes: '' }).data?.durationMinutes).toBe(30);
    const { durationMinutes: _omit, ...withoutDuration } = valid;
    expect(interviewFormSchema(t).safeParse(withoutDuration).data?.durationMinutes).toBe(30);
    expect(interviewFormSchema(t).safeParse({ ...valid, durationMinutes: '240' }).success).toBe(true);
    for (const durationMinutes of ['0', '241', '12.5', 'abc']) {
      expect(issuesFor({ ...valid, durationMinutes })[0]).toEqual({
        path: ['durationMinutes'],
        message: 'validation.interview.duration',
      });
    }
  });

  it('accepts an optional phone, trimmed, and rejects an absurdly long one', () => {
    expect(interviewFormSchema(t).safeParse({ ...valid, phone: ' (46) 99999-8888 ' }).data?.phone).toBe(
      '(46) 99999-8888'
    );
    expect(issuesFor({ ...valid, phone: '9'.repeat(41) })[0].path).toEqual(['phone']);
  });
});
