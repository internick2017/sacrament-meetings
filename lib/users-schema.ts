import { z } from 'zod';
import { ROLES, ORGANIZATION_KEYS } from './types';
import type { Translator } from './i18n';

export function userFormSchema(t: Translator) {
  return z
    .object({
      // Lowercased here so it matches the unique index on lower(email) and the
      // case-insensitive allow-list lookup.
      email: z
        .string()
        .trim()
        .transform((value) => value.toLowerCase())
        .refine((value) => z.email().safeParse(value).success, {
          message: t('validation.user.email'),
        }),
      role: z.enum(ROLES),
      // Empty string means "no organization". A select cannot send undefined.
      organizationKey: z.union([z.enum(ORGANIZATION_KEYS), z.literal('')]),
    })
    // A leader of no organization could edit nothing, which is a
    // misconfiguration rather than a valid state, so it is rejected here
    // instead of silently creating a useless account.
    .refine((data) => data.role !== 'leader' || data.organizationKey !== '', {
      message: t('validation.user.leaderNeedsOrganization'),
      path: ['organizationKey'],
    });
}
