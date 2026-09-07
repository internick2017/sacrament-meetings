'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { requireLeaderOf, NotAuthorizedError, getSessionUser } from './authz';
import { getT } from './i18n/server';
import { eventFormSchema } from './events-schema';
import { addEvent, updateEvent, deleteEvent, getEventOrganizationId } from './events-db';
import { getOrganizationIdByKey } from './organizations-db';

export interface EventFormState {
  message?: string;
  errors?: Record<string, string[] | undefined>;
  // Echo of the raw submitted values, so a failed validation does not throw
  // away what the user typed. Absent on success, so the form resets empty.
  values?: {
    organizationKey: string;
    title: string;
    description: string;
    location: string;
    startsAt: string;
    endsAt: string;
    allDay: string;
    audience: string;
  };
}

function rawValuesFromForm(formData: FormData): EventFormState['values'] & object {
  return {
    organizationKey: String(formData.get('organizationKey') ?? ''),
    title: String(formData.get('title') ?? ''),
    description: String(formData.get('description') ?? ''),
    location: String(formData.get('location') ?? ''),
    startsAt: String(formData.get('startsAt') ?? ''),
    endsAt: String(formData.get('endsAt') ?? ''),
    allDay: formData.get('allDay') ? 'on' : 'off',
    audience: String(formData.get('audience') ?? 'public'),
  };
}

export async function addEventAction(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const t = await getT();
  const rawValues = rawValuesFromForm(formData);

  const parsed = eventFormSchema(t).safeParse(rawValues);
  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values: rawValues,
    };
  }

  // Empty organizationKey means the activity belongs to the whole branch.
  const organizationId =
    parsed.data.organizationKey === ''
      ? null
      : await getOrganizationIdByKey(parsed.data.organizationKey);
  if (organizationId === undefined) {
    // The enum already restricts the key to the seven seeded organizations,
    // so this only fires if the database and the code have drifted apart.
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

  const user = await getSessionUser();

  await addEvent(
    {
      organizationId,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      startsAt: parsed.data.startsAt,
      endsAt: parsed.data.endsAt === '' ? null : parsed.data.endsAt,
      allDay: parsed.data.allDay,
      audience: parsed.data.audience,
      coverUrl: null,
    },
    user ? Number(user.id) : null
  );

  revalidatePath('/activities');
  return { message: t('activities.saved') };
}

export async function updateEventAction(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const t = await getT();
  const rawValues = rawValuesFromForm(formData);

  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) {
    return { message: t('validation.fixFields'), values: rawValues };
  }

  const parsed = eventFormSchema(t).safeParse(rawValues);
  if (!parsed.success) {
    return {
      message: t('validation.fixFields'),
      errors: z.flattenError(parsed.error).fieldErrors,
      values: rawValues,
    };
  }

  // The activity's current organization must be looked up before permission
  // can be checked at all: asking permission first and resolving the target
  // afterwards would let a leader act on another organization's activity by
  // guessing its id.
  const currentOrganizationId = await getEventOrganizationId(id);
  if (currentOrganizationId === undefined) {
    // No such activity. Fail silently rather than treat a missing row as
    // congregation-wide.
    return { message: t('validation.fixFields'), values: rawValues };
  }

  const newOrganizationId =
    parsed.data.organizationKey === ''
      ? null
      : await getOrganizationIdByKey(parsed.data.organizationKey);
  if (newOrganizationId === undefined) {
    return { message: t('validation.fixFields'), values: rawValues };
  }

  // The form can change which organization the activity belongs to. That
  // means permission must be checked on BOTH the activity's current
  // organization and the one being submitted: checking only the current one
  // would let a leader move another organization's activity into their own,
  // and checking only the submitted one would let them take an activity that
  // is not theirs. requireLeaderOf(null) fails for a leader, so this also
  // stops a leader turning their own activity into a congregation-wide one.
  try {
    await requireLeaderOf(currentOrganizationId);
    await requireLeaderOf(newOrganizationId);
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { message: t('admin.notAllowed'), values: rawValues };
    }
    throw error;
  }

  await updateEvent(id, {
    organizationId: newOrganizationId,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    startsAt: parsed.data.startsAt,
    endsAt: parsed.data.endsAt === '' ? null : parsed.data.endsAt,
    allDay: parsed.data.allDay,
    audience: parsed.data.audience,
    coverUrl: null,
  });

  revalidatePath('/activities');
  return { message: t('activities.saved') };
}

// Deleting takes only the id from the form, so the organization the
// activity belongs to must be looked up before permission can be checked:
// asking permission first and resolving the target afterwards would let a
// leader act on another organization's activity by guessing its id.
//
// This action has no form state to report an error into and returns void, so
// a NotAuthorizedError is caught and swallowed rather than left to surface as
// an unexplained 500.
export async function deleteEventAction(formData: FormData): Promise<void> {
  const id = Number(formData.get('id'));
  if (!Number.isInteger(id)) {
    return;
  }

  const organizationId = await getEventOrganizationId(id);
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

  await deleteEvent(id);
  revalidatePath('/activities');
}
