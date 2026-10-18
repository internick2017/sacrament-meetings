import { z } from 'zod';
import { INTERVIEWERS, interviewerAllowedFor } from './interviews-rules';
import type { Translator } from './i18n';

const INTERVIEWER_KEYS = INTERVIEWERS.map((interviewer) => interviewer.key) as [
  (typeof INTERVIEWERS)[number]['key'],
  ...(typeof INTERVIEWERS)[number]['key'][],
];

// A datetime-local value: 'YYYY-MM-DDTHH:mm', optionally with ':ss'.
const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

// The shape alone is not enough: '2026-02-30T10:00' matches the pattern, and
// both zonedLocalToInstant and findConflicts would quietly roll it over or
// fail open. So the numbers must survive a round trip through Date.UTC
// unchanged, which only happens for a real calendar date and clock time.
export function isValidLocalDateTime(value: string): boolean {
  const match = LOCAL_DATETIME.exec(value);
  if (!match) return false;
  const [year, month, day, hour, minute] = match.slice(1, 6).map(Number);
  const second = match[6] === undefined ? 0 : Number(match[6]);
  const date = new Date(Date.UTC(year, month - 1, day, hour, minute, second));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day &&
    date.getUTCHours() === hour &&
    date.getUTCMinutes() === minute &&
    date.getUTCSeconds() === second
  );
}

const DEFAULT_DURATION_MINUTES = 30;

export function interviewFormSchema(t: Translator) {
  return z
    .object({
      memberId: z.coerce
        .number({ error: t('validation.interview.member') })
        .int(t('validation.interview.member'))
        .positive(t('validation.interview.member')),
      kind: z.enum(['tithing', 'individual'], { error: t('validation.interview.kind') }),
      interviewer: z.enum(INTERVIEWER_KEYS, { error: t('validation.interview.interviewer') }),
      // Free local wall-clock text; the action converts it to an instant in
      // the unit's time zone only after this check has passed.
      startsLocal: z
        .string()
        .trim()
        .refine(isValidLocalDateTime, { message: t('validation.interview.startsAt') }),
      // An empty or missing field means the default slot length.
      durationMinutes: z.preprocess(
        (value) => (value === undefined || value === null || value === '' ? DEFAULT_DURATION_MINUTES : value),
        z.coerce
          .number({ error: t('validation.interview.duration') })
          .int(t('validation.interview.duration'))
          .min(1, t('validation.interview.duration'))
          .max(240, t('validation.interview.duration'))
      ),
      mode: z.enum(['in_person', 'online'], { error: t('validation.interview.mode') }),
      onlineLink: z.string().trim().max(500).optional().default(''),
      // Optional. Whether it is usable for WhatsApp is decided by the action
      // (normalizePhone); the length cap only stops absurd input.
      phone: z.string().trim().max(40, t('validation.interview.phone')).optional().default(''),
    })
    .superRefine((data, ctx) => {
      // Enforced here, server side, even though the form never offers it:
      // a tithing interview is only ever with Nick.
      if (!interviewerAllowedFor(data.kind, data.interviewer)) {
        ctx.addIssue({
          code: 'custom',
          path: ['interviewer'],
          message: t('validation.interview.tithingOnlyNick'),
        });
      }
      if (data.mode === 'online' && data.onlineLink === '') {
        ctx.addIssue({
          code: 'custom',
          path: ['onlineLink'],
          message: t('validation.interview.onlineLinkRequired'),
        });
      }
    })
    .transform((data) => ({
      ...data,
      // A link only means something for an online interview.
      onlineLink: data.mode === 'online' ? data.onlineLink : null,
    }));
}

export type InterviewFormData = z.output<ReturnType<typeof interviewFormSchema>>;
