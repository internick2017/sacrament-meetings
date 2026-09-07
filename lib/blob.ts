import { put, del } from '@vercel/blob';

// File uploads need a Vercel Blob credential that this project does not have
// yet. Rather than failing, the site simply saves activities without a cover
// image: an activity with no picture is a normal, well-designed state here, not
// a degraded one.
export const coverUploadEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);

const MAX_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Returns the public URL of the stored image, or null when there is nothing to
// store, no credential to store it with, or the file is not an acceptable
// image. Never throws: losing a picture must never cost the leader the text
// they wrote.
export async function uploadCover(file: File | null): Promise<string | null> {
  if (!file || file.size === 0 || !coverUploadEnabled) {
    return null;
  }
  if (!ALLOWED_TYPES.includes(file.type) || file.size > MAX_BYTES) {
    return null;
  }

  try {
    // DESIGN NOTE (not resolved by this fix): `access: 'public'` means a
    // cover's URL requires no session or credential to fetch — the UUID in
    // the path is the ONLY thing keeping a private activity's picture from
    // an anonymous visitor who happens to have (or guesses) the link.
    // Vercel Blob's private access needs signed URLs and a different
    // serving path than a plain <img src>, which is a real design change,
    // not a one-line fix, so it is deliberately left for whoever wires up
    // the BLOB_READ_WRITE_TOKEN credential to decide on purpose rather than
    // discover by accident.
    const blob = await put(`activities/${crypto.randomUUID()}`, file, {
      access: 'public',
      contentType: file.type,
    });
    return blob.url;
  } catch (error) {
    console.error('Cover upload failed, saving the activity without it', error);
    return null;
  }
}

// Deletes a previously stored cover from Blob storage. Called whenever a
// cover is replaced, removed, or its activity is deleted, so an old image
// does not stay reachable forever at its unguessable-but-public URL.
//
// Never throws: a leader's edit or delete must always succeed even if the
// old file is already gone, the credential is missing, or Blob is
// unreachable. Losing track of one orphaned file is an acceptable outcome;
// failing the user's action over it is not.
export async function deleteCover(url: string | null | undefined): Promise<void> {
  if (!url || !coverUploadEnabled) {
    return;
  }
  try {
    await del(url);
  } catch (error) {
    console.error('Cover delete failed, leaving the old file in place', error);
  }
}
