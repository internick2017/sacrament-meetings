import { describe, it, expect } from 'vitest';
import { announcementFormSchema } from './announcements-schema';

const t = ((key: string) => key) as never;

const valid = {
  organizationKey: 'relief_society',
  title: 'Cambio de horario',
  body: 'La reunion empieza a las 10.',
  startsOn: '',
  endsOn: '2026-10-31',
  audience: 'public',
};

describe('announcementFormSchema', () => {
  it('accepts a valid announcement', () => {
    expect(announcementFormSchema(t).safeParse(valid).success).toBe(true);
  });

  it('accepts one for the whole unit, which has no organization', () => {
    expect(
      announcementFormSchema(t).safeParse({ ...valid, organizationKey: '' }).success
    ).toBe(true);
  });

  it('requires a title', () => {
    const result = announcementFormSchema(t).safeParse({ ...valid, title: '  ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['title']);
  });

  // The point of the whole phase: an announcement that never expires is the
  // problem this feature exists to solve.
  it('REQUIRES an end date', () => {
    const result = announcementFormSchema(t).safeParse({ ...valid, endsOn: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['endsOn']);
  });

  it('accepts an empty start date, meaning it is in force from today', () => {
    expect(announcementFormSchema(t).safeParse({ ...valid, startsOn: '' }).success).toBe(true);
  });

  it('rejects an end before the start', () => {
    const result = announcementFormSchema(t).safeParse({
      ...valid,
      startsOn: '2026-10-31',
      endsOn: '2026-10-01',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['endsOn']);
  });

  it('rejects a malformed date', () => {
    const result = announcementFormSchema(t).safeParse({ ...valid, endsOn: '31/10/2026' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['endsOn']);
  });

  it('rejects an unknown audience', () => {
    expect(
      announcementFormSchema(t).safeParse({ ...valid, audience: 'everyone' }).success
    ).toBe(false);
  });

  it('rejects an unknown organization', () => {
    expect(
      announcementFormSchema(t).safeParse({ ...valid, organizationKey: 'choir' }).success
    ).toBe(false);
  });
});
