'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireAdmin, NotAuthorizedError } from './authz';
import { getT } from './i18n/server';
import { unitFormSchema } from './unit-schema';
import { updateUnit } from './unit-db';

export interface UnitFormState {
  message?: string;
  errors?: Record<string, string[] | undefined>;
}

// The unit's own settings are congregation-wide, not per-organization, so
// only an admin may change them.
export async function updateUnitAction(
  _prevState: UnitFormState,
  formData: FormData
): Promise<UnitFormState> {
  const t = await getT();
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed') };
    }
    throw error;
  }

  const parsed = unitFormSchema(t).safeParse({
    name: formData.get('name'),
    unitType: formData.get('unitType'),
    stakeName: formData.get('stakeName') ?? '',
    address: formData.get('address') ?? '',
    meetingTimes: formData.get('meetingTimes') ?? '',
    timezone: formData.get('timezone'),
    calendarUrl: formData.get('calendarUrl') ?? '',
    directoryUrl: formData.get('directoryUrl') ?? '',
    contactNote: formData.get('contactNote') ?? '',
  });

  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  await updateUnit(parsed.data);

  // The unit shows up on the home page and in the layout, so revalidate the
  // whole tree rather than a single route.
  revalidatePath('/', 'layout');
  return { message: t('unit.saved') };
}
