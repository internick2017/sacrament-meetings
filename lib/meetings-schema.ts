import { z } from 'zod';
import type { Hymn, ProgramItem, WardBusinessItem } from './types';
import type { MeetingInput } from './meetings-db';
import type { Translator } from './i18n';

const MEETING_TYPES = ['testimony', 'regular', 'stake', 'general', 'special'] as const;

const HYMNS = ['openingHymn', 'sacramentHymn', 'closingHymn'] as const;

// The raw form values as strings. The same object is validated and, when
// validation fails, echoed back so the form keeps what the user typed.
export function meetingFormValues(formData: FormData) {
  const text = (name: string) => String(formData.get(name) ?? '');
  return {
    date: text('date'),
    meetingType: text('meetingType'),
    presiding: text('presiding'),
    conducting: text('conducting'),
    openingHymnNumber: text('openingHymnNumber'),
    openingHymnTitle: text('openingHymnTitle'),
    openingPrayer: text('openingPrayer'),
    sacramentHymnNumber: text('sacramentHymnNumber'),
    sacramentHymnTitle: text('sacramentHymnTitle'),
    closingHymnNumber: text('closingHymnNumber'),
    closingHymnTitle: text('closingHymnTitle'),
    closingPrayer: text('closingPrayer'),
    stakeBusiness: formData.get('stakeBusiness') ? 'on' : 'off',
    announcements: text('announcements'),
    wardBusiness: text('wardBusiness'),
    speakers: text('speakers'),
  };
}

export type MeetingFormValues = ReturnType<typeof meetingFormValues>;

function nonEmptyLines(raw: string): string[] {
  return raw
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

function parseWardBusiness(raw: string): WardBusinessItem[] {
  return nonEmptyLines(raw).map((description) => ({ description }));
}

// Each line is a speaker written "Name | Topic", unless it starts with "M:" (or
// "Music:"), which marks a musical number written "M: Performer | Title".
function parseProgram(raw: string): ProgramItem[] {
  return nonEmptyLines(raw).map((line) => {
    const musical = /^m(?:usic)?:\s*(.*)$/i.exec(line);
    if (musical) {
      const [performer = '', title = ''] = musical[1].split('|').map((s) => s.trim());
      return { type: 'musical-number', performer, title: title || undefined };
    }
    const [name = '', topic = ''] = line.split('|').map((s) => s.trim());
    return { type: 'speaker', name, topic };
  });
}

// Built per request because every message comes from the visitor's dictionary.
// Only date and type are required: the rest of a program is decided over the
// following weeks, and a blank field is stored as NULL ("not decided yet").
export function meetingFormSchema(t: Translator) {
  const optionalText = z
    .string()
    .trim()
    .transform((value) => value || null);

  const hymnNumber = z
    .string()
    .trim()
    .transform((value) => (value === '' ? null : Number(value)))
    .pipe(
      z
        .number({ error: t('validation.hymnInt') })
        .int(t('validation.hymnInt'))
        .min(1, t('validation.hymnMin'))
        .max(1000, t('validation.hymnMax'))
        .nullable()
    );

  // Hymn numbers differ between hymnbooks and lib/hymns.ts matches on the
  // title, so a number alone cannot be turned into a title: a hymn needs both.
  const hymnTitleRequired = {
    openingHymn: t('validation.required.openingHymnTitle'),
    sacramentHymn: t('validation.required.sacramentHymnTitle'),
    closingHymn: t('validation.required.closingHymnTitle'),
  };

  return z
    .object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, t('validation.date')),
      meetingType: z.enum(MEETING_TYPES),
      presiding: optionalText,
      conducting: optionalText,
      openingHymnNumber: hymnNumber,
      openingHymnTitle: optionalText,
      openingPrayer: optionalText,
      sacramentHymnNumber: hymnNumber,
      sacramentHymnTitle: optionalText,
      closingHymnNumber: hymnNumber,
      closingHymnTitle: optionalText,
      closingPrayer: optionalText,
      stakeBusiness: z.enum(['on', 'off']).transform((value) => value === 'on'),
      announcements: z.string().transform(nonEmptyLines),
      wardBusiness: z.string().transform(parseWardBusiness),
      speakers: z.string().transform(parseProgram),
    })
    .superRefine((data, ctx) => {
      for (const hymn of HYMNS) {
        const number = data[`${hymn}Number`];
        const title = data[`${hymn}Title`];
        if (number === null && title !== null) {
          ctx.addIssue({
            code: 'custom',
            path: [`${hymn}Number`],
            message: t('validation.hymnNumberNeeded'),
          });
        }
        if (number !== null && title === null) {
          ctx.addIssue({
            code: 'custom',
            path: [`${hymn}Title`],
            message: hymnTitleRequired[hymn],
          });
        }
      }
    })
    .transform((data): MeetingInput => {
      const hymn = (number: number | null, title: string | null): Hymn | null =>
        number !== null && title !== null ? { number, title } : null;

      return {
        date: data.date,
        meetingType: data.meetingType,
        presiding: data.presiding,
        conducting: data.conducting,
        announcements: data.announcements,
        openingHymn: hymn(data.openingHymnNumber, data.openingHymnTitle),
        openingPrayer: data.openingPrayer,
        wardBusiness: data.wardBusiness,
        stakeBusiness: data.stakeBusiness,
        sacramentHymn: hymn(data.sacramentHymnNumber, data.sacramentHymnTitle),
        program: data.speakers,
        closingHymn: hymn(data.closingHymnNumber, data.closingHymnTitle),
        closingPrayer: data.closingPrayer,
      };
    });
}
