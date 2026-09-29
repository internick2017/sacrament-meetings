import { describe, it, expect } from 'vitest';
import { meetingFormSchema, meetingFormValues, type MeetingFormValues } from './meetings-schema';

const t = ((key: string) => key) as never;

const blank: MeetingFormValues = {
  date: '2026-10-04',
  meetingType: 'regular',
  presiding: '',
  conducting: '',
  openingHymnNumber: '',
  openingHymnTitle: '',
  openingPrayer: '',
  sacramentHymnNumber: '',
  sacramentHymnTitle: '',
  closingHymnNumber: '',
  closingHymnTitle: '',
  closingPrayer: '',
  stakeBusiness: 'off',
  announcements: '',
  wardBusiness: '',
  speakers: '',
};

function parse(overrides: Partial<MeetingFormValues> = {}) {
  return meetingFormSchema(t).safeParse({ ...blank, ...overrides });
}

function fieldErrorPaths(overrides: Partial<MeetingFormValues>) {
  const result = parse(overrides);
  expect(result.success).toBe(false);
  return result.error?.issues.map((issue) => issue.path.join('.'));
}

describe('meetingFormSchema', () => {
  it('accepts a meeting with only a date and a type, leaving everything else undecided', () => {
    const result = parse();
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      date: '2026-10-04',
      meetingType: 'regular',
      presiding: null,
      conducting: null,
      announcements: [],
      openingHymn: null,
      openingPrayer: null,
      wardBusiness: [],
      stakeBusiness: false,
      sacramentHymn: null,
      program: [],
      closingHymn: null,
      closingPrayer: null,
    });
  });

  it('stores whitespace-only input as null, never as an empty string', () => {
    const result = parse({
      presiding: '   ',
      conducting: '\t',
      openingPrayer: ' ',
      closingPrayer: '  ',
      openingHymnNumber: ' ',
      openingHymnTitle: '  ',
    });
    expect(result.success).toBe(true);
    expect(result.data).toMatchObject({
      presiding: null,
      conducting: null,
      openingPrayer: null,
      closingPrayer: null,
      openingHymn: null,
    });
  });

  it('keeps filled text fields, trimmed', () => {
    const result = parse({ presiding: '  President Silva ', closingPrayer: 'Sister Costa' });
    expect(result.data).toMatchObject({ presiding: 'President Silva', closingPrayer: 'Sister Costa' });
  });

  it('builds a hymn from a number and a title', () => {
    const result = parse({ sacramentHymnNumber: '169', sacramentHymnTitle: 'As Now We Take the Sacrament' });
    expect(result.success).toBe(true);
    expect(result.data?.sacramentHymn).toEqual({ number: 169, title: 'As Now We Take the Sacrament' });
  });

  it('rejects a title without a number, on the number field', () => {
    expect(fieldErrorPaths({ openingHymnTitle: 'The Spirit of God' })).toEqual(['openingHymnNumber']);
  });

  it('rejects a number without a title, on the title field, because numbers differ between hymnbooks', () => {
    expect(fieldErrorPaths({ closingHymnNumber: '2' })).toEqual(['closingHymnTitle']);
  });

  it('rejects a hymn number that is not a whole number', () => {
    expect(fieldErrorPaths({ openingHymnNumber: '1.5', openingHymnTitle: 'x' })).toEqual([
      'openingHymnNumber',
    ]);
  });

  it('still rejects an invalid date', () => {
    expect(fieldErrorPaths({ date: '04/10/2026' })).toEqual(['date']);
  });

  it('still rejects a missing meeting type', () => {
    expect(fieldErrorPaths({ meetingType: '' })).toEqual(['meetingType']);
  });

  it('parses speakers and musical numbers the same way as before', () => {
    const result = parse({
      speakers: 'Brother Lima | Faith\n\nM: Primary choir | I Am a Child of God\nMusic: Sister Rocha\n',
    });
    expect(result.data?.program).toEqual([
      { type: 'speaker', name: 'Brother Lima', topic: 'Faith' },
      { type: 'musical-number', performer: 'Primary choir', title: 'I Am a Child of God' },
      { type: 'musical-number', performer: 'Sister Rocha', title: undefined },
    ]);
  });

  it('parses announcements and ward business one item per line', () => {
    const result = parse({ announcements: 'Youth activity\n\n Temple trip ', wardBusiness: 'Release of X' });
    expect(result.data?.announcements).toEqual(['Youth activity', 'Temple trip']);
    expect(result.data?.wardBusiness).toEqual([{ description: 'Release of X' }]);
  });
});

describe('meetingFormValues', () => {
  it('reads absent fields as empty strings and an unchecked box as off', () => {
    const formData = new FormData();
    formData.set('date', '2026-10-04');
    formData.set('meetingType', 'testimony');
    const values = meetingFormValues(formData);
    expect(values.presiding).toBe('');
    expect(values.stakeBusiness).toBe('off');
    expect(meetingFormSchema(t).safeParse(values).success).toBe(true);
  });

  it('reads a checked box as on', () => {
    const formData = new FormData();
    formData.set('stakeBusiness', 'on');
    expect(meetingFormValues(formData).stakeBusiness).toBe('on');
  });
});
