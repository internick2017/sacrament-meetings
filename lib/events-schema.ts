import { z } from 'zod';
import { AUDIENCES, ORGANIZATION_KEYS } from './types';
import type { Translator } from './i18n';

export function eventFormSchema(t: Translator) {
  return z
    .object({
      // Empty string means the activity belongs to the whole branch. The
      // resolution from key to organization id happens in the Server Action,
      // after this schema has already accepted the shape.
      organizationKey: z.union([z.enum(ORGANIZATION_KEYS), z.literal('')]),
      title: z.string().trim().min(1, t('validation.event.required.title')),
      description: z.string().trim().optional().default(''),
      location: z.string().trim().optional().default(''),
      // Forms send the datetime-local value as 'YYYY-MM-DDTHH:mm'.
      startsAt: z.string().trim().min(1, t('validation.event.required.startsAt')),
      // Empty means no declared end; otherwise it must parse as a date.
      endsAt: z
        .string()
        .trim()
        .refine((value) => value === '' || !Number.isNaN(Date.parse(value)), {
          message: t('validation.event.invalidDate'),
        }),
      // An HTML checkbox sends 'on' when checked and omits the field
      // entirely when not, so the field arrives as 'on' or 'off' from the
      // form-reading code and is coerced to a boolean here.
      allDay: z.union([z.literal('on'), z.literal('off')]).transform((value) => value === 'on'),
      audience: z.enum(AUDIENCES),
    })
    .refine(
      (data) => {
        if (data.endsAt === '') {
          return true;
        }
        return Date.parse(data.endsAt) > Date.parse(data.startsAt);
      },
      {
        message: t('validation.event.endBeforeStart'),
        path: ['endsAt'],
      }
    );
}
