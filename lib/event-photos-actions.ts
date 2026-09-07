'use server';

import { revalidatePath } from 'next/cache';
import { requireLeaderOf, requireAdmin, NotAuthorizedError, getSessionUser } from './authz';
import { getT } from './i18n/server';
import { getEventOrganizationId } from './events-db';
import { getOrganizationKeyById } from './organizations-db';
import { needsApproval } from './photo-rules';
import { addEventPhoto, approveEventPhoto, deleteEventPhoto, getPhotoEventId, getPhotoUrl } from './event-photos-db';
import { uploadImage, deleteImage, ALLOWED_TYPES, MAX_BYTES } from './blob';

const PHOTO_BLOB_PREFIX = 'event-photos';

// A caption with no bound would let a leader store an arbitrarily large
// string in a column meant for a short line of context. Trimmed and
// truncated explicitly (rather than left unbounded) so the stored value is
// always predictable.
const CAPTION_MAX_LENGTH = 500;

export interface PhotoFormState {
  message?: string;
}

// `user.id` is a string from the session; Number(user.id) on a malformed or
// missing id would silently insert NaN into uploaded_by/approved_by. Guard
// it so a bad session value falls back to null (unattributed) instead of
// corrupting the row. Same helper as lib/events-actions.ts.
function userIdFromUser(user: { id: string } | null): number | null {
  if (!user) {
    return null;
  }
  const id = Number(user.id);
  return Number.isInteger(id) ? id : null;
}

// Resolves whether an activity's photos need bishopric approval, from the
// activity's OWN organization, on the server. `organizationId` is what
// getEventOrganizationId returns: null means the activity belongs to the
// whole branch (photo-rules treats a null organization as needing
// approval), a number is looked up for its org_key. If the organization row
// has vanished between the two reads (should not happen; ids only append),
// the lookup fails safe by treating it the same as null.
async function resolveNeedsApproval(organizationId: number | null): Promise<boolean> {
  if (organizationId === null) {
    return needsApproval(null);
  }
  const organizationKey = await getOrganizationKeyById(organizationId);
  return needsApproval(organizationKey ?? null);
}

// Uploads a photo to an activity's gallery.
//
// Ordering (paid for three times already by this project, see
// lib/events-actions.ts): the activity's organization is resolved BEFORE
// permission is asked (so a leader cannot probe another organization's
// activity by guessing its id), and the file is only uploaded AFTER
// permission is confirmed, so an unauthorized request never spends a Blob
// upload. `approved` is computed here, server-side, from the activity's own
// organization — never from the form — which is the entire guarantee this
// phase exists to provide.
//
// Returns a PhotoFormState (the `{ message? }` shape used by the other
// *-actions.ts files) rather than void, so a leader whose upload was
// rejected sees why instead of watching the form silently clear. Type and
// size are checked here explicitly, rather than only inside uploadImage, so
// those two cases can be told apart in the message; a missing Blob
// credential (the third reason uploadImage can return null) is left silent
// on purpose, same as an activity's cover: this project already treats "no
// upload credential configured" as a normal, non-error environment state,
// not something to surface to a leader as if their file were at fault.
//
// A permission failure still returns without spending an upload, and with
// no message — same silent shape as before — so a rejected request never
// leaks whether the activity exists or what organization it belongs to.
export async function uploadEventPhotoAction(
  _prevState: PhotoFormState,
  formData: FormData
): Promise<PhotoFormState> {
  const t = await getT();

  const rawEventId = formData.get('eventId');
  const eventId = rawEventId === null || rawEventId === '' ? NaN : Number(rawEventId);
  if (!Number.isInteger(eventId) || eventId <= 0) {
    return { message: t('validation.photo.invalidId') };
  }

  const organizationId = await getEventOrganizationId(eventId);
  if (organizationId === undefined) {
    // No such activity. Same message as a malformed id: neither case should
    // tell an unauthorized caller anything more specific than "that id is
    // no good".
    return { message: t('validation.photo.invalidId') };
  }

  try {
    await requireLeaderOf(organizationId);
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return {};
    }
    throw error;
  }

  const photoFile = formData.get('photo');
  if (!(photoFile instanceof File) || photoFile.size === 0) {
    // Nothing was submitted; nothing to record and nothing to explain.
    return {};
  }
  if (!ALLOWED_TYPES.includes(photoFile.type)) {
    return { message: t('validation.photo.invalidType') };
  }
  if (photoFile.size > MAX_BYTES) {
    return { message: t('validation.photo.tooLarge') };
  }

  const url = await uploadImage(photoFile, PHOTO_BLOB_PREFIX);
  if (!url) {
    // Type and size were already checked above, so the only remaining
    // reason uploadImage can fail here is no Blob credential (or a failed
    // put()) — left silent, see the function comment above.
    return {};
  }

  const rawCaption = String(formData.get('caption') ?? '').trim();
  const caption = rawCaption.slice(0, CAPTION_MAX_LENGTH);
  const approved = !(await resolveNeedsApproval(organizationId));
  const user = await getSessionUser();

  await addEventPhoto({
    eventId,
    url,
    caption,
    approved,
    uploadedBy: userIdFromUser(user),
  });

  revalidatePath(`/activities/${eventId}`);
  revalidatePath('/admin/photos');

  return {};
}

// Publishes a pending photo. Admin only, on purpose: a leader may upload and
// delete photos of their own activities, but approving is the one thing only
// the bishopric does — that asymmetry is the whole reason this phase exists,
// so this must call requireAdmin() and NOTHING that would let a leader
// through (requireLeaderOf is never called here).
export async function approveEventPhotoAction(formData: FormData): Promise<void> {
  const rawId = formData.get('id');
  const id = rawId === null || rawId === '' ? NaN : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  const eventId = await getPhotoEventId(id);
  if (eventId === undefined) {
    return;
  }

  let admin;
  try {
    admin = await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return;
    }
    throw error;
  }

  await approveEventPhoto(id, userIdFromUser(admin));

  revalidatePath(`/activities/${eventId}`);
  revalidatePath('/admin/photos');
}

// Deletes a photo, and its stored file. A leader may delete any photo of an
// activity in their own organization without further discussion (the spec's
// call). The activity is resolved before permission is asked, same reasoning
// as everywhere else in this file: an id must never be usable to probe
// another organization's data before we know which organization it belongs
// to.
export async function deleteEventPhotoAction(formData: FormData): Promise<void> {
  const rawId = formData.get('id');
  const id = rawId === null || rawId === '' ? NaN : Number(rawId);
  if (!Number.isInteger(id) || id <= 0) {
    return;
  }

  const eventId = await getPhotoEventId(id);
  if (eventId === undefined) {
    return;
  }

  const organizationId = await getEventOrganizationId(eventId);
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

  // Look up the file before the row is gone, so it can be cleaned up from
  // Blob storage too; deleteImage never throws, so a missing or
  // already-gone file never blocks the deletion.
  const url = await getPhotoUrl(id);
  await deleteEventPhoto(id);
  await deleteImage(url);

  revalidatePath(`/activities/${eventId}`);
  revalidatePath('/admin/photos');
}
