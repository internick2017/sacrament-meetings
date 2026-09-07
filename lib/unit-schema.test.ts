import { describe, it, expect } from 'vitest';
import { unitFormSchema } from './unit-schema';

// The real translator reads a cookie; here a stub is enough, because these
// tests check which field failed, not what the message says.
const t = ((key: string) => key) as never;

const valid = {
  name: 'Rama Francisco Beltrao',
  unitType: 'branch',
  stakeName: 'Estaca Pato Branco',
  address: 'Rua Tal 123',
  meetingTimes: 'Domingo 9:00',
  timezone: 'America/Sao_Paulo',
  calendarUrl: 'https://churchofjesuschrist.org/calendar',
  directoryUrl: '',
  contactNote: '',
};

describe('unitFormSchema', () => {
  it('accepts a fully filled unit', () => {
    expect(unitFormSchema(t).safeParse(valid).success).toBe(true);
  });

  it('requires a name', () => {
    const result = unitFormSchema(t).safeParse({ ...valid, name: '  ' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['name']);
  });

  it('rejects an unknown unit type', () => {
    expect(unitFormSchema(t).safeParse({ ...valid, unitType: 'stake' }).success).toBe(false);
  });

  it('allows the optional links to be empty', () => {
    const result = unitFormSchema(t).safeParse({ ...valid, calendarUrl: '' });
    expect(result.success).toBe(true);
  });

  it('rejects a link that is not a URL', () => {
    const result = unitFormSchema(t).safeParse({ ...valid, calendarUrl: 'not a url' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['calendarUrl']);
  });

  it('rejects a javascript: URL', () => {
    const result = unitFormSchema(t).safeParse({
      ...valid,
      calendarUrl: 'javascript:alert(1)',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['calendarUrl']);
  });

  it('rejects a plain http:// URL', () => {
    const result = unitFormSchema(t).safeParse({
      ...valid,
      calendarUrl: 'http://churchofjesuschrist.org/calendar',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['calendarUrl']);
  });

  it('accepts an https:// URL', () => {
    const result = unitFormSchema(t).safeParse({
      ...valid,
      calendarUrl: 'https://churchofjesuschrist.org/calendar',
    });
    expect(result.success).toBe(true);
  });

  it('still accepts the empty string', () => {
    const result = unitFormSchema(t).safeParse({ ...valid, calendarUrl: '' });
    expect(result.success).toBe(true);
  });

  it('rejects a timezone that is not a real IANA zone', () => {
    const result = unitFormSchema(t).safeParse({ ...valid, timezone: 'Not/AZone' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(['timezone']);
  });

  it('accepts a valid IANA timezone', () => {
    const result = unitFormSchema(t).safeParse({ ...valid, timezone: 'America/Sao_Paulo' });
    expect(result.success).toBe(true);
  });
});
