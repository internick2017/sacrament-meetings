import { z } from 'zod';
import { ORGANIZATION_KEYS } from './types';
import type { Translator } from './i18n';

export function callingFormSchema(t: Translator) {
  return z.object({
    organizationKey: z.enum(ORGANIZATION_KEYS),
    // A person is a name. This schema deliberately has no contact field, and
    // adding one would break the project's data-minimisation rule.
    personName: z.string().trim().min(1, t('validation.required.personName')),
    title: z.string().trim().min(1, t('validation.required.callingTitle')),
    // Forms send strings; coerce before validating, as the meeting form does.
    displayOrder: z.coerce
      .number()
      .int(t('validation.displayOrderInt'))
      .min(0, t('validation.displayOrderMin')),
  });
}
