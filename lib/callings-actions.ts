'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { auth } from './auth';
import { getT } from './i18n/server';
import { callingFormSchema } from './callings-schema';
import { addCalling, deleteCalling, endCalling } from './people-db';
import { getOrganizationIdByKey } from './organizations-db';

export interface CallingFormState {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  // Echo of the raw submitted values, so a failed validation does not throw
  // away what the user typed. Absent on success, so the form resets empty.
  values?: {
    organizationKey: string;
    personName: string;
    title: string;
    displayOrder: string;
  };
}

// Authorisation is checked here, on the server, in every action. Hiding a
// button is not security: anyone can POST to a Server Action. Phase 2 replaces
// these session checks with requireAdmin().
async function requireSession(): Promise<boolean> {
  const session = await auth();
  return !!session;
}

export async function addCallingAction(
  _prevState: CallingFormState,
  formData: FormData
): Promise<CallingFormState> {
  const t = await getT();
  if (!(await requireSession())) {
    return { message: t('admin.notAllowed') };
  }

  const rawValues = {
    organizationKey: String(formData.get('organizationKey') ?? ''),
    personName: String(formData.get('personName') ?? ''),
    title: String(formData.get('title') ?? ''),
    displayOrder: String(formData.get('displayOrder') ?? '0'),
  };

  const parsed = callingFormSchema(t).safeParse(rawValues);

  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values: rawValues,
    };
  }

  const organizationId = await getOrganizationIdByKey(parsed.data.organizationKey);
  if (organizationId === undefined) {
    // The enum already restricts the key to the seven seeded organizations, so
    // this only fires if the database and the code have drifted apart.
    return { message: t('validation.fixFields'), values: rawValues };
  }

  await addCalling({
    organizationId,
    personName: parsed.data.personName,
    title: parsed.data.title,
    displayOrder: parsed.data.displayOrder,
  });

  revalidatePath('/organizations');
  revalidatePath('/callings');
  return { message: t('callings.added') };
}

// Ending a calling keeps the row as history. Deleting removes it, for
// correcting a typo. Both take the id from the form and check the session
// first.
export async function endCallingAction(formData: FormData): Promise<void> {
  if (!(await requireSession())) {
    return;
  }
  const id = Number(formData.get('id'));
  if (Number.isInteger(id)) {
    await endCalling(id);
    revalidatePath('/organizations');
    revalidatePath('/callings');
  }
}

export async function deleteCallingAction(formData: FormData): Promise<void> {
  if (!(await requireSession())) {
    return;
  }
  const id = Number(formData.get('id'));
  if (Number.isInteger(id)) {
    await deleteCalling(id);
    revalidatePath('/organizations');
    revalidatePath('/callings');
  }
}
