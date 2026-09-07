import { z } from 'zod';
import type { Translator } from './i18n';

const UNIT_TYPES = ['ward', 'branch'] as const;

// Built per request, not at module load, so every message comes from the
// visitor's dictionary. Same reason as meetingFormSchema in lib/actions.ts.
export function unitFormSchema(t: Translator) {
  // An optional link is either empty or a real https:// URL. z.url() alone
  // accepts any scheme it can parse (javascript:, mailto:, ftp://, plain
  // http://), which both mismatches the "starts with https://" message shown
  // to the user and, for javascript: URLs rendered as <a href> on the public
  // home page, is a stored XSS vector. An empty string stays valid: a unit
  // that has not published a calendar yet is a normal state, not an error.
  const optionalUrl = z
    .string()
    .trim()
    .refine(
      (value) =>
        value === '' ||
        (z.url().safeParse(value).success && value.startsWith('https://')),
      { message: t('validation.unit.url') }
    );

  return z.object({
    name: z.string().trim().min(1, t('validation.required.unitName')),
    unitType: z.enum(UNIT_TYPES),
    stakeName: z.string().trim(),
    address: z.string().trim(),
    meetingTimes: z.string().trim(),
    timezone: z.string().trim().min(1, t('validation.required.timezone')),
    calendarUrl: optionalUrl,
    directoryUrl: optionalUrl,
    contactNote: z.string().trim(),
  });
}
