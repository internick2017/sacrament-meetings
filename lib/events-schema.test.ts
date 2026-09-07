import { describe, it, expect } from 'vitest';
import { eventFormSchema } from './events-schema';

const t = ((key: string) => key) as never;

const valid = {
  organizationKey: 'relief_society',
  title: 'Noche de hogar',
  description: '',
  location: 'Capilla',
  startsAt: '2026-10-02T19:00',
  endsAt: '',
  allDay: 'off',
  audience: 'public',
};

describe('eventFormSchema', () => {
  it('accepts a valid activity', () => {
    expect(eventFormSchema(t).safeParse(valid).success).toBe(true);
  });

  it('accepts a branch-wide activity, which has no organization', () => {
    expect(eventFormSchema(t).safeParse({ ...valid, organizationKey: '' }).success).toBe(true);
  });

  it('requires a title', () => {
    const result = eventFormSchema(t).safeParse({ ...valid, title: '   ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['title']);
  });

  it('requires a start date', () => {
    const result = eventFormSchema(t).safeParse({ ...valid, startsAt: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['startsAt']);
  });

  it('rejects an end before the start, which is the mistake people actually make', () => {
    const result = eventFormSchema(t).safeParse({
      ...valid,
      startsAt: '2026-10-02T19:00',
      endsAt: '2026-10-02T18:00',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['endsAt']);
  });

  it('accepts an empty end, because many activities have no declared end', () => {
    expect(eventFormSchema(t).safeParse({ ...valid, endsAt: '' }).success).toBe(true);
  });

  it('rejects an unknown audience', () => {
    expect(eventFormSchema(t).safeParse({ ...valid, audience: 'everyone' }).success).toBe(false);
  });

  it('rejects an unknown organization', () => {
    expect(eventFormSchema(t).safeParse({ ...valid, organizationKey: 'choir' }).success).toBe(
      false
    );
  });

  it('turns the checkbox value into a boolean', () => {
    const on = eventFormSchema(t).safeParse({ ...valid, allDay: 'on' });
    expect(on.data?.allDay).toBe(true);
    const off = eventFormSchema(t).safeParse({ ...valid, allDay: 'off' });
    expect(off.data?.allDay).toBe(false);
  });
});
