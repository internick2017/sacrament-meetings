'use server';

import { revalidatePath } from 'next/cache';
import { requireAdmin, NotAuthorizedError } from './authz';
import {
  getPersonById,
  clearPersonPhoto,
  personHasCurrentCalling,
  deletePerson,
} from './people-db';
import { deleteImage } from './blob';
import { getT } from './i18n/server';

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

export interface RemovePersonResult {
  ok: boolean;
  message?: string;
}

// Admin-only permanent removal of a person who currently holds NO calling —
// the orphan a deleted calling leaves behind (see people-db.ts's
// getPeopleWithNoCurrentCalling, the only screen that can even reach this
// action) or anyone who has simply been released. This exists because the
// site's whole design is to hold the minimum personal data and be able to
// take it back out: an orphaned person otherwise sits in the `people` table
// forever, invisible on every screen, for no purpose.
//
// Refusing while a CURRENT calling exists (ended_on IS NULL) is deliberate:
// it forces "release, then remove" as two separate, visible steps, so an
// accidental removal of someone still serving takes two mistakes, not one.
//
// callings.person_id is ON DELETE CASCADE (003_organizations.sql), so this
// also deletes the person's released/history callings — their record of
// service. That is intended for someone who has moved away, but it is a
// real loss of history, not just a row; the confirmation text the caller
// shows (callings.confirmRemovePerson) says so, not just this comment.
// users.person_id is ON DELETE SET NULL (004_accounts_roles.sql), so a
// linked account is unlinked, never deleted, by this action.
export async function adminRemovePersonAction(
  _prevState: RemovePersonResult,
  formData: FormData
): Promise<RemovePersonResult> {
  const t = await getT();
  const personId = Number(formData.get('personId'));
  if (!Number.isInteger(personId) || personId <= 0) {
    return { ok: false };
  }

  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof NotAuthorizedError) {
      return { ok: false, message: t('admin.notAllowed') };
    }
    throw error;
  }

  if (await personHasCurrentCalling(personId)) {
    return { ok: false, message: t('people.hasCurrentCalling') };
  }

  const person = await getPersonById(personId);

  await deletePerson(personId);
  try {
    await deleteImage(person?.photoUrl);
  } catch (error) {
    console.error('Image delete failed, leaving the old file in place', error);
  }

  revalidatePath('/callings');
  revalidatePath('/organizations');
  revalidatePath('/profile');
  return { ok: true, message: t('people.removed') };
}
