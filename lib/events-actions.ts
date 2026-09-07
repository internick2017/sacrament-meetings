'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { requireLeaderOf, NotAuthorizedError, getSessionUser } from './authz';
import { getT } from './i18n/server';
import { eventFormSchema } from './events-schema';
import {
  addEvent,
  updateEvent,
  deleteEvent,
  getEventOrganizationId,
  getEventCoverUrl,
} from './events-db';
import { getOrganizationIdByKey } from './organizations-db';
import { getUnit } from './unit-db';
import { zonedLocalToInstant } from './timezone';
import { uploadCover, deleteCover } from './blob';

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
    removeCover: string;
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
    // A privacy-bearing field must never default to the more exposed value:
    // match the database column's own default (see db/migrations/006_events.sql)
    // rather than assuming public.
    audience: String(formData.get('audience') ?? 'private'),
    removeCover: formData.get('removeCover') ? 'on' : 'off',
  };
}

// A file input's chosen file cannot be echoed back into the form when
// validation fails (the remount-by-key pattern rebuilds the DOM node, but
// browsers refuse to let script set an <input type="file">'s value for
// security reasons). Rather than silently dropping the file with no
// explanation, tell the leader plainly that they need to pick it again.
function messageWithCoverNotice(message: string, formData: FormData, t: Awaited<ReturnType<typeof getT>>): string {
  const cover = formData.get('cover');
  if (cover instanceof File && cover.size > 0) {
    return `${message} ${t('activities.reselectCover')}`;
  }
  return message;
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
      message: messageWithCoverNotice(t('validation.fixFields'), formData, t),
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

  // The upload only happens once the write is known to be allowed: spending
  // an upload on a request that will be rejected anyway would waste storage
  // and let an unauthorized caller trigger writes to Blob.
  const coverFile = formData.get('cover');
  const coverUrl = await uploadCover(coverFile instanceof File ? coverFile : null);

  const user = await getSessionUser();

  // The form sends naive 'YYYY-MM-DDTHH:mm' local values. They must be
  // converted to real instants in the congregation's own timezone before
  // being written to a timestamptz column, or Postgres will interpret them
  // in the session's timezone (UTC on this project's host) instead — see
  // zonedLocalToInstant for the full explanation.
  const unit = await getUnit();
  const startsAt = zonedLocalToInstant(parsed.data.startsAt, unit.timezone);
  const endsAt =
    parsed.data.endsAt === '' ? null : zonedLocalToInstant(parsed.data.endsAt, unit.timezone);

  const id = await addEvent(
    {
      organizationId,
      title: parsed.data.title,
      description: parsed.data.description,
      location: parsed.data.location,
      startsAt,
      endsAt,
      allDay: parsed.data.allDay,
      audience: parsed.data.audience,
      coverUrl,
    },
    createdByFromUser(user)
  );

  // Redirect to the new activity's own page, matching updateEventAction:
  // otherwise a leader who just created their first activity never sees it
  // and has no link to it.
  revalidatePath('/activities');
  revalidatePath(`/activities/${id}`);
  redirect(`/activities/${id}`);
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

export async function updateEventAction(
  _prevState: EventFormState,
  formData: FormData
): Promise<EventFormState> {
  const t = await getT();
  const rawValues = rawValuesFromForm(formData);

  // A missing 'id' field must not pass this guard: Number(null) is 0, which
  // Number.isInteger accepts, so the field's presence is checked first and
  // the id is required to be a positive integer (activity ids start at 1).
  const rawId = formData.get('id');
  const id = rawId === null || rawId === '' ? NaN : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return { message: t('validation.fixFields'), values: rawValues };
  }

  const parsed = eventFormSchema(t).safeParse(rawValues);
  if (!parsed.success) {
    return {
      message: messageWithCoverNotice(t('validation.fixFields'), formData, t),
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
    // No such activity. Reported with the SAME message as a forbidden
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

  // The upload only happens once the write is known to be allowed (same
  // reasoning as addEventAction). A leader who ticks "remove cover" without
  // also picking a new file gets null regardless of what uploadCover would
  // have returned; otherwise, no file chosen and no removal requested means
  // the existing cover_url is carried forward unchanged, so a plain text
  // edit never silently deletes the picture.
  const coverFile = formData.get('cover');
  const uploadedCoverUrl = await uploadCover(coverFile instanceof File ? coverFile : null);
  const removeCover = rawValues.removeCover === 'on';
  const existingCoverUrl = (await getEventCoverUrl(id)) ?? null;
  let coverUrl: string | null;
  if (uploadedCoverUrl) {
    coverUrl = uploadedCoverUrl;
  } else if (removeCover) {
    coverUrl = null;
  } else {
    coverUrl = existingCoverUrl;
  }

  // A replaced or removed cover leaves its old file orphaned in Blob storage
  // unless it is explicitly deleted here. Never blocks the save: deleteCover
  // never throws.
  if (existingCoverUrl && existingCoverUrl !== coverUrl) {
    await deleteCover(existingCoverUrl);
  }

  // See addEventAction for why the naive local values must be converted
  // using the congregation's timezone before they reach a timestamptz column.
  const unit = await getUnit();
  const startsAt = zonedLocalToInstant(parsed.data.startsAt, unit.timezone);
  const endsAt =
    parsed.data.endsAt === '' ? null : zonedLocalToInstant(parsed.data.endsAt, unit.timezone);

  await updateEvent(id, {
    organizationId: newOrganizationId,
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    startsAt,
    endsAt,
    allDay: parsed.data.allDay,
    audience: parsed.data.audience,
    coverUrl,
  });

  // Revalidate both the list and the detail page, then redirect there,
  // matching the meetings precedent in lib/actions.ts (updateMeeting). Without
  // this, the form remounts with the pre-save `event` prop (a stale server
  // render) and the detail page keeps showing the old content even though
  // the save succeeded.
  revalidatePath('/activities');
  revalidatePath(`/activities/${id}`);
  redirect(`/activities/${id}`);
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

  // Look up the cover before the row is gone, so the file can be cleaned up
  // from Blob storage too; deleteCover never throws, so a missing or
  // already-gone file never blocks the deletion.
  const coverUrl = await getEventCoverUrl(id);
  await deleteEvent(id);
  await deleteCover(coverUrl);
  revalidatePath('/activities');
}
