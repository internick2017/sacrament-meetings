'use server';

import { revalidatePath } from 'next/cache';
import { getSessionUser } from './authz';
import { getT } from './i18n/server';
import { getAppUserById } from './users-db';
import { getPersonById, setPersonPhoto, clearPersonPhoto } from './people-db';
import { uploadImage, deleteImage, ALLOWED_TYPES, MAX_BYTES } from './blob';

const PROFILE_PHOTO_BLOB_PREFIX = 'profile-photos';

export interface ProfileFormState {
  message?: string;
}

// Does NOT belong to a form-submitted id, this is the whole point of this
// module: the only person a session can ever affect through these two
// actions is whoever is signed in. A `personId` field on the FormData (if
// one is ever submitted, by mistake or by someone probing the action) is
// never read anywhere in this file.
//
// Resolves the caller's own person_id from the session, or null if there is
// no session, no matching user row, or no person linked to that account.
// Deliberately does NOT gate on photoUploadAllowed: that switch controls
// whether a new photo can be added, not whether an existing one — uploaded
// while it was on — can be removed. Revoking the switch must never trap a
// member with a photo they can no longer take down themselves.
async function resolveOwnPersonId(): Promise<number | null> {
  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    return null;
  }
  const id = Number(sessionUser.id);
  if (!Number.isInteger(id)) {
    return null;
  }
  const user = await getAppUserById(id);
  if (!user || user.personId === null) {
    return null;
  }
  return user.personId;
}

// Uploads the signed-in member's own profile photo.
//
// The write target — which `people` row gets `photo_url` and
// `photo_consent_at` — comes ONLY from the session's own user.personId,
// resolved server-side. A `personId` submitted in the form is never read,
// so no request, however it is shaped, can put a photo on anyone else's
// row. That is the entire guarantee this phase exists to provide; see
// lib/profile-actions.test.ts for the test that proves it.
//
// Order of checks matters, same reasoning as uploadEventPhotoAction: no
// session, no account, upload not allowed, or no linked person all exit
// before the file is ever uploaded, so an unauthorized or misconfigured
// request never spends a Blob upload.
export async function uploadProfilePhotoAction(
  _prevState: ProfileFormState,
  formData: FormData
): Promise<ProfileFormState> {
  const t = await getT();

  const sessionUser = await getSessionUser();
  if (!sessionUser) {
    // No session: nothing to do, and nothing to explain — this action is
    // unreachable without one through the UI.
    return {};
  }

  const id = Number(sessionUser.id);
  const user = Number.isInteger(id) ? await getAppUserById(id) : undefined;
  if (!user) {
    return {};
  }

  if (!user.photoUploadAllowed) {
    return { message: t('profile.notAllowed') };
  }

  if (user.personId === null) {
    return { message: t('profile.noPersonLinked') };
  }

  const photoFile = formData.get('photo');
  if (!(photoFile instanceof File) || photoFile.size === 0) {
    return {};
  }
  if (!ALLOWED_TYPES.includes(photoFile.type)) {
    return { message: t('validation.photo.invalidType') };
  }
  if (photoFile.size > MAX_BYTES) {
    return { message: t('validation.photo.tooLarge') };
  }

  const url = await uploadImage(photoFile, PROFILE_PHOTO_BLOB_PREFIX);
  if (!url) {
    // Type and size were already checked above, so the only remaining
    // reason is no Blob credential (or a failed put()) — left silent, same
    // as the activity gallery's uploadEventPhotoAction.
    return {};
  }

  // Replacing an existing photo: clean up the old file so it does not stay
  // reachable forever at its old URL. Looked up before the write so the old
  // url is still known; deleteImage never throws, so a failure here can
  // never cost the member their new photo.
  const person = await getPersonById(user.personId);
  await setPersonPhoto(user.personId, url);
  if (person?.photoUrl) {
    await deleteImage(person.photoUrl);
  }

  revalidatePath('/profile');
  revalidatePath('/organizations');

  return { message: t('profile.uploaded') };
}

// Removes the signed-in member's own profile photo: one click, by the
// person, with nobody else's permission. Same rule as the upload above —
// the row affected is only ever the session's own person_id, never a form
// field — this function does not even look for a personId in formData.
export async function deleteProfilePhotoAction(): Promise<void> {
  const personId = await resolveOwnPersonId();
  if (personId === null) {
    return;
  }

  const person = await getPersonById(personId);

  // Clear the database row first, then best-effort delete the stored file.
  // A storage failure must never leave a member unable to remove their own
  // photo from the site. deleteImage never throws by contract (lib/blob.ts
  // catches internally), but this action does not depend on that contract:
  // the row is already cleared above, and the catch here is defence in
  // depth so a rejection can never surface as a failed action or an
  // unhandled error.
  await clearPersonPhoto(personId);
  try {
    await deleteImage(person?.photoUrl);
  } catch (error) {
    console.error('Image delete failed, leaving the old file in place', error);
  }

  revalidatePath('/profile');
  revalidatePath('/organizations');
}
