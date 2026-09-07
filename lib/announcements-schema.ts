import { z } from 'zod';
import { AUDIENCES, ORGANIZATION_KEYS } from './types';
import type { Translator } from './i18n';

// Matches an input type="date" value: 'YYYY-MM-DD'. Deliberately not a full
// Date.parse check — a date-only string compares correctly as a string, and
// converting to Date here would reintroduce the timezone confusion that cost
// a fix round in phase 3 (a validity window is a calendar day, not an
// instant).
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function announcementFormSchema(t: Translator) {
  return z
    .object({
      // Empty string means the announcement belongs to the whole unit. The
      // resolution from key to organization id happens in the Server
      // Action, after this schema has already accepted the shape.
      organizationKey: z.union([z.enum(ORGANIZATION_KEYS), z.literal('')]),
      title: z.string().trim().min(1, t('validation.announcement.required.title')),
      body: z.string().trim().optional().default(''),
      // Empty means "in force from today"; otherwise it must be a valid
      // 'YYYY-MM-DD' date.
      startsOn: z
        .string()
        .trim()
        .refine((value) => value === '' || DATE_PATTERN.test(value), {
          message: t('validation.announcement.invalidDate'),
        }),
      // Never optional: an announcement that never expires is the exact
      // problem this feature exists to solve.
      endsOn: z
        .string()
        .trim()
        .min(1, t('validation.announcement.required.endsOn'))
        .refine((value) => DATE_PATTERN.test(value), {
          message: t('validation.announcement.invalidDate'),
        }),
      audience: z.enum(AUDIENCES),
    })
    .refine(
      (data) => {
        if (data.startsOn === '' || !DATE_PATTERN.test(data.endsOn)) {
          return true;
        }
        // 'YYYY-MM-DD' strings compare correctly with plain string
        // comparison; do NOT convert to Date here (see DATE_PATTERN comment).
        return data.endsOn >= data.startsOn;
      },
      {
        message: t('validation.announcement.endBeforeStart'),
        path: ['endsOn'],
      }
    );
}
