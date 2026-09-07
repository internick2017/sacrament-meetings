'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireLeaderOf, NotAuthorizedError } from './authz';
import { getT } from './i18n/server';
import { callingFormSchema } from './callings-schema';
import { addCalling, deleteCalling, endCalling } from './people-db';
import { getOrganizationIdByKey, getCallingOrganizationId } from './organizations-db';

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

export async function addCallingAction(
  _prevState: CallingFormState,
  formData: FormData
): Promise<CallingFormState> {
  const t = await getT();

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

  // The organization the write targets is resolved first; permission is then
  // asked for that specific organization. Asking first would let a leader
  // probe another organization's key before we even know which one it is.
  try {
    await requireLeaderOf(organizationId);
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed'), values: rawValues };
    }
    throw error;
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
// correcting a typo. Both take only the id from the form, so the organization
// the calling belongs to must be looked up before permission can be checked:
// asking permission first and resolving the target afterwards would let a
// leader act on another organization's calling by guessing its id.
//
// Neither action has form state to report an error into, and both return
// void, so a NotAuthorizedError is caught and swallowed rather than left to
// surface as an unexplained 500.
export async function endCallingAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) {
    return;
  }

  const organizationId = await getCallingOrganizationId(id);
  if (organizationId === undefined) {
    return;
  }

  try {
    await requireLeaderOf(organizationId);
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return;
    }
    throw error;
  }

  await endCalling(id);
  revalidatePath('/organizations');
  revalidatePath('/callings');
}

export async function deleteCallingAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) {
    return;
  }

  const organizationId = await getCallingOrganizationId(id);
  if (organizationId === undefined) {
    return;
  }

  try {
    await requireLeaderOf(organizationId);
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return;
    }
    throw error;
  }

  await deleteCalling(id);
  revalidatePath('/organizations');
  revalidatePath('/callings');
}
