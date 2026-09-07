import { z } from 'zod';
import type { Translator } from './i18n';

const UNIT_TYPES = ['ward', 'branch'] as const;

// Built per request, not at module load, so every message comes from the
// visitor's dictionary. Same reason as meetingFormSchema in lib/actions.ts.
export function unitFormSchema(t: Translator) {
  // An optional link is either empty or a real URL. z.url() alone would reject
  // the empty string, and a unit that has not published a calendar yet is a
  // normal state, not an error.
  const optionalUrl = z
    .string()
    .trim()
    .refine(
      (value) => value === '' || z.url().safeParse(value).success,
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
