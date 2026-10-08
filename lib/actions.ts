'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect, notFound } from 'next/navigation';
import {
  addMeeting as dbAddMeeting,
  updateMeeting as dbUpdateMeeting,
  deleteMeeting as dbDeleteMeeting,
} from './meetings-db';
import { meetingFormSchema, meetingFormValues, type MeetingFormValues } from './meetings-schema';
import { requireAdmin, NotAuthorizedError } from './authz';
import { userIdOf } from './authz-rules';
import type { SessionUser } from './types';
import { getT } from './i18n/server';
import type { Translator } from './i18n';

// What each create/edit form action returns to useActionState: a general
// message and per-field error arrays keyed by the input's name.
export interface MeetingFormState {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  // Echo of the raw submitted values, so a failed validation does not throw
  // away what the user typed. Absent on success.
  values?: MeetingFormValues;
}

// The meetings table has a UNIQUE constraint on `date` (one meeting per day).
// A collision is Postgres error 23505 (unique_violation). We treat it as a
// correctable form error, not an unexpected server failure.
function isDuplicateDateError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === '23505'
  );
}

function duplicateDateState(t: Translator): MeetingFormState {
  return {
    message: t('validation.fixFields'),
    errors: { date: [t('validation.duplicateDate')] },
  };
}

// --- Server Actions --------------------------------------------------------

export async function createMeeting(
  _prevState: MeetingFormState,
  formData: FormData
): Promise<MeetingFormState> {
  const t = await getT();
  let user: SessionUser;
  try {
    user = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed') };
    }
    throw error;
  }

  const values = meetingFormValues(formData);
  const parsed = meetingFormSchema(t).safeParse(values);
  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }

  // Validation errors are returned above; only unexpected database failures are
  // caught here and re-thrown so the meetings error boundary can handle them.
  try {
    await dbAddMeeting(parsed.data, userIdOf(user));
  } catch (error) {
    if (isDuplicateDateError(error)) {
      return { ...duplicateDateState(t), values };
    }
    console.error('createMeeting failed:', error);
    throw new Error(t('validation.saveFailed'));
  }

  revalidatePath('/meetings');
  redirect('/meetings');
}

export async function updateMeeting(
  id: number,
  _prevState: MeetingFormState,
  formData: FormData
): Promise<MeetingFormState> {
  const t = await getT();
  let user: SessionUser;
  try {
    user = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed') };
    }
    throw error;
  }

  const values = meetingFormValues(formData);
  const parsed = meetingFormSchema(t).safeParse(values);
  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values,
    };
  }

  let updated = false;
  try {
    updated = await dbUpdateMeeting(id, parsed.data, userIdOf(user));
  } catch (error) {
    if (isDuplicateDateError(error)) {
      return { ...duplicateDateState(t), values };
    }
    console.error('updateMeeting failed:', error);
    throw new Error(t('validation.updateFailed'));
  }

  if (!updated) {
    notFound();
  }

  revalidatePath('/meetings');
  revalidatePath(`/meetings/${id}`);
  redirect(`/meetings/${id}`);
}

export async function deleteMeeting(formData: FormData): Promise<void> {
  let user: SessionUser;
  try {
    user = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return;
    }
    throw error;
  }

  const t = await getT();
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) {
    throw new Error(t('validation.invalidId'));
  }

  try {
    await dbDeleteMeeting(id, userIdOf(user));
  } catch (error) {
    console.error('deleteMeeting failed:', error);
    throw new Error(t('validation.deleteFailed'));
  }

  revalidatePath('/meetings');
  redirect('/meetings');
}
