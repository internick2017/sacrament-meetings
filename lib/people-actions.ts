'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, NotAuthorizedError } from './authz';
import { getPersonById, clearPersonPhoto } from './people-db';
import { deleteImage } from './blob';

// Admin-only removal of a person's profile photo — the route that did not
// exist before this fix. A member who asks for their face to be taken down,
// or whose account has already been deleted, otherwise has NO path to
// removal at all: lib/profile-actions.ts only lets the session's OWN
// person_id be touched.
//
// This is REMOVAL ONLY, and that is deliberate, not an oversight: there is
// no admin "set photo for this person" counterpart anywhere in the app, and
// there must never be one. Consent for a profile photo is given by the
// member uploading it themselves (see setPersonPhoto, always called with
// the session's own person_id); an admin choosing a photo FOR someone else
// would be collection, not consent, which is a different and worse thing
// than the gap this function closes. If a future change ever adds an admin
// "upload" action, it fails the reviewer's original guarantee even if this
// comment survives — see the "admin can only remove, never add" test in
// lib/people-actions.test.ts, which pins this asymmetry down.
export async function adminRemovePersonPhotoAction(formData: FormData): Promise<void> {
  const personId = Number(formData.get('personId'));
  if (!Number.isInteger(personId) || personId <= 0) {
    return;
  }

  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return;
    }
    throw error;
  }

  const person = await getPersonById(personId);

  // Clear the row first, then best-effort delete the stored file — same
  // ordering as deleteProfilePhotoAction, so a storage failure can never
  // leave the row (and therefore the public gallery/profile) still showing
  // the photo.
  await clearPersonPhoto(personId);
  try {
    await deleteImage(person?.photoUrl);
  } catch (error) {
    console.error('Image delete failed, leaving the old file in place', error);
  }

  revalidatePath('/callings');
  revalidatePath('/organizations');
  revalidatePath('/profile');
}
