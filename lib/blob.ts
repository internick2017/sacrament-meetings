import { put } from '@vercel/blob';

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
