'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireLeaderOf, NotAuthorizedError, getSessionUser } from './authz';
import { getT } from './i18n/server';
import { announcementFormSchema } from './announcements-schema';
import {
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementOrganizationId,
} from './announcements-db';
import { getOrganizationIdByKey } from './organizations-db';

export interface AnnouncementFormState {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  // Echo of the raw submitted values, so a failed validation does not throw
  // away what the user typed. Absent on success, so the form resets empty.
  values?: {
    organizationKey: string;
    title: string;
    body: string;
    startsOn: string;
    endsOn: string;
    audience: string;
  };
}

function rawValuesFromForm(formData: FormData): AnnouncementFormState['values'] & object {
  return {
    organizationKey: String(formData.get('organizationKey') ?? ''),
    title: String(formData.get('title') ?? ''),
    body: String(formData.get('body') ?? ''),
    startsOn: String(formData.get('startsOn') ?? ''),
    endsOn: String(formData.get('endsOn') ?? ''),
    // A privacy-bearing field must never default to the more exposed value:
    // match the database column's own default rather than assuming public.
    audience: String(formData.get('audience') ?? 'private'),
  };
}

// `user.id` is a string from the session; Number(user.id) on a malformed or
// missing id would silently insert NaN into created_by. Guard it so a bad
// session value falls back to null (unattributed) instead of corrupting the
// row.
function createdByFromUser(user: { id: string } | null): number | null {
  if (!user) {
    return null;
  }
  const id = Number(user.id);
  return Number.isInteger(id) ? id : null;
}

export async function addAnnouncementAction(
  _prevState: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const t = await getT();
  const rawValues = rawValuesFromForm(formData);

  const parsed = announcementFormSchema(t).safeParse(rawValues);
  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values: rawValues,
    };
  }

  // Empty organizationKey means the announcement belongs to the whole unit.
  const organizationId =
    parsed.data.organizationKey === ''
      ? null
      : await getOrganizationIdByKey(parsed.data.organizationKey);
  if (organizationId === undefined) {
    // The enum already restricts the key to the seven seeded organizations,
    // so this only fires if the database and the code have drifted apart.
    return { message: t('validation.fixFields'), values: rawValues };
  }

  // The organization the write targets is resolved first; permission is
  // then asked for that specific organization. Asking first would let a
  // leader probe another organization's key before we even know which one
  // it is.
  try {
    await requireLeaderOf(organizationId);
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed'), values: rawValues };
    }
    throw error;
  }

  const user = await getSessionUser();

  await addAnnouncement(
    {
      organizationId,
      title: parsed.data.title,
      body: parsed.data.body,
      startsOn: parsed.data.startsOn === '' ? null : parsed.data.startsOn,
      endsOn: parsed.data.endsOn,
      audience: parsed.data.audience,
    },
    createdByFromUser(user)
  );

  // The home page also renders announcements (see AnnouncementList usage in
  // app/page.tsx), not just /announcements, so the whole layout must be
  // revalidated too — same pattern as updateUnitAction in unit-actions.ts.
  revalidatePath('/announcements');
  revalidatePath('/', 'layout');
  redirect('/announcements');
}

export async function updateAnnouncementAction(
  _prevState: AnnouncementFormState,
  formData: FormData
): Promise<AnnouncementFormState> {
  const t = await getT();
  const rawValues = rawValuesFromForm(formData);

  // A missing 'id' field must not pass this guard: Number(null) is 0, which
  // Number.isInteger accepts, so the field's presence is checked first and
  // the id is required to be a positive integer.
  const rawId = formData.get('id');
  const id = rawId === null || rawId === '' ? NaN : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return { message: t('validation.fixFields'), values: rawValues };
  }

  const parsed = announcementFormSchema(t).safeParse(rawValues);
  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values: rawValues,
    };
  }

  // The announcement's current organization must be looked up before
  // permission can be checked at all: asking permission first and resolving
  // the target afterwards would let a leader act on another organization's
  // announcement by guessing its id.
  const currentOrganizationId = await getAnnouncementOrganizationId(id);
  if (currentOrganizationId === undefined) {
    // No such announcement. Reported with the SAME message as a forbidden
    // request (admin.notAllowed), not a validation error: a distinct
    // "does not exist" message would let a leader probe which ids are real
    // by comparing the two responses.
    return { message: t('admin.notAllowed'), values: rawValues };
  }

  const newOrganizationId =
    parsed.data.organizationKey === ''
      ? null
      : await getOrganizationIdByKey(parsed.data.organizationKey);
  if (newOrganizationId === undefined) {
    return { message: t('validation.fixFields'), values: rawValues };
  }

  // The form can change which organization the announcement belongs to.
  // That means permission must be checked on BOTH the announcement's
  // current organization and the one being submitted: checking only the
  // current one would let a leader move another organization's announcement
  // into their own, and checking only the submitted one would let them take
  // an announcement that is not theirs. requireLeaderOf(null) fails for a
  // leader, so this also stops a leader turning their own announcement into
  // a unit-wide one.
  try {
    await requireLeaderOf(currentOrganizationId);
    await requireLeaderOf(newOrganizationId);
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed'), values: rawValues };
    }
    throw error;
  }

  await updateAnnouncement(id, {
    organizationId: newOrganizationId,
    title: parsed.data.title,
    body: parsed.data.body,
    startsOn: parsed.data.startsOn === '' ? null : parsed.data.startsOn,
    endsOn: parsed.data.endsOn,
    audience: parsed.data.audience,
  });

  revalidatePath('/announcements');
  revalidatePath('/', 'layout');
  redirect('/announcements');
}

// Deleting takes only the id from the form, so the organization the
// announcement belongs to must be looked up before permission can be
// checked: asking permission first and resolving the target afterwards
// would let a leader act on another organization's announcement by guessing
// its id.
//
// This action has no form state to report an error into and returns void, so
// a NotAuthorizedError is caught and swallowed rather than left to surface
// as an unexplained 500.
export async function deleteAnnouncementAction(formData: FormData): Promise<void> {
  const rawId = formData.get('id');
  const id = rawId === null || rawId === '' ? NaN : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  const organizationId = await getAnnouncementOrganizationId(id);
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

  await deleteAnnouncement(id);
  revalidatePath('/announcements');
  revalidatePath('/', 'layout');
}
