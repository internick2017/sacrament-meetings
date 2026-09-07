import { put, del } from '@vercel/blob';

// File uploads need a Vercel Blob credential that this project does not have
// yet. Rather than failing, the site simply saves activities without a cover
// image: an activity with no picture is a normal, well-designed state here, not
// a degraded one.
export const coverUploadEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

// Same underlying credential as covers: both are Vercel Blob uploads, so
// there is only one thing to have or not have. Kept as a separate export
// (rather than reusing coverUploadEnabled directly at call sites) so a
// screen that only cares about photos never has to know the name of an
// activity-cover concept.
export const photoUploadEnabled = coverUploadEnabled;

const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Returns the public URL of the stored image, or null when there is nothing to
// store, no credential to store it with, or the file is not an acceptable
// image. Never throws: losing a picture must never cost the caller the rest
// of what they submitted. `prefix` is the Blob path segment (e.g.
// 'activities' or 'event-photos') so different kinds of uploads don't share
// one flat namespace.
export async function uploadImage(file: File | null, prefix: string): Promise<string | null> {
  if (!file || file.size === 0 || !coverUploadEnabled) {
    return null;
  }
  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
    return null;
  }

  try {
    // DESIGN NOTE (not resolved by this fix): `access: 'public'` means an
    // image's URL requires no session or credential to fetch — the UUID in
    // the path is the ONLY thing keeping a private activity's picture from
    // an anonymous visitor who happens to have (or guesses) the link.
    // Vercel Blob's private access needs signed URLs and a different
    // serving path than a plain <img src>, which is a real design change,
    // not a one-line fix, so it is deliberately left for whoever wires up
    // the BLOB_READ_WRITE_TOKEN credential to decide on purpose rather than
    // discover by accident.
    const blob = await put(`${prefix}/${crypto.randomUUID()}`, file, {
      access: 'public',
      contentType: file.type,
    });
    return blob.url;
  } catch (error) {
    console.error(`Image upload failed for prefix "${prefix}"`, error);
    return null;
  }
}

// Deletes a previously stored image from Blob storage. Called whenever an
// image is replaced, removed, or its owning row is deleted, so an old file
// does not stay reachable forever at its unguessable-but-public URL.
//
// Never throws: a caller's edit or delete must always succeed even if the
// old file is already gone, the credential is missing, or Blob is
// unreachable. Losing track of one orphaned file is an acceptable outcome;
// failing the user's action over it is not.
export async function deleteImage(url: string | null | undefined): Promise<void> {
  if (!url || !coverUploadEnabled) {
    return;
  }
  try {
    await del(url);
  } catch (error) {
    console.error('Image delete failed, leaving the old file in place', error);
  }
}

// Thin wrapper kept so the activities feature (phase 3) never has to change:
// same signature and behaviour as before this file was generalised.
export async function uploadCover(file: File | null): Promise<string | null> {
  return uploadImage(file, 'activities');
}

// Thin wrapper kept so the activities feature (phase 3) never has to change.
export async function deleteCover(url: string | null | undefined): Promise<void> {
  return deleteImage(url);
}
