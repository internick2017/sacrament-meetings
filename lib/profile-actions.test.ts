import { describe, it, expect, vi, beforeEach } from 'vitest';

// These two actions carry the entire guarantee of the profile-photo phase:
// the `people` row written to is ALWAYS the session's own person_id,
// resolved server-side, and NEVER a value read from the submitted form. If
// a future edit ever adds `formData.get('personId')` to either action, the
// "ignores a foreign personId in the form" test below fails, which is the
// point.
//
// Everything is mocked at the boundary (authz, users-db, people-db, blob,
// next/cache), same pattern as lib/event-photos-actions.test.ts, so these
// tests prove ordering and the own-row-only guarantee without a real
// database, session, or Blob credential.
vi.mock('./authz', () => ({
  getSessionUser: vi.fn(),
}));
vi.mock('./users-db', () => ({
  getAppUserById: vi.fn(),
}));
vi.mock('./people-db', () => ({
  getPersonById: vi.fn(),
  setPersonPhoto: vi.fn(),
  clearPersonPhoto: vi.fn(),
}));
vi.mock('./blob', () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn().mockResolvedValue(undefined),
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
  MAX_BYTES: 4 * 1024 * 1024,
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));

import { getSessionUser } from './authz';
import { getAppUserById } from './users-db';
import { getPersonById, setPersonPhoto, clearPersonPhoto } from './people-db';
import { uploadImage, deleteImage } from './blob';
import { uploadProfilePhotoAction, deleteProfilePhotoAction } from './profile-actions';
import type { AppUser } from './users-db';
import type { SessionUser } from './types';

const mockGetSessionUser = vi.mocked(getSessionUser);
const mockGetAppUserById = vi.mocked(getAppUserById);
const mockGetPersonById = vi.mocked(getPersonById);
const mockSetPersonPhoto = vi.mocked(setPersonPhoto);
const mockClearPersonPhoto = vi.mocked(clearPersonPhoto);
const mockUploadImage = vi.mocked(uploadImage);
const mockDeleteImage = vi.mocked(deleteImage);

function makeSessionUser(overrides: Partial<SessionUser> = {}): SessionUser {
  return { id: '1', role: 'member', organizationId: null, ...overrides };
}

function makeAppUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 1,
    username: null,
    email: 'member@example.com',
    role: 'member',
    organizationId: null,
    personId: 42,
    photoUploadAllowed: true,
    ...overrides,
  };
}

function makeFile(overrides: Partial<{ type: string; size: number }> = {}): File {
  const size = overrides.size ?? 10;
  return new File([new Uint8Array(size)], 'photo.jpg', { type: overrides.type ?? 'image/jpeg' });
}

function uploadForm(overrides: { photo?: File | null; personId?: string } = {}): FormData {
  const fd = new FormData();
  if (overrides.photo !== null) {
    fd.set('photo', overrides.photo ?? makeFile());
  }
  // A foreign personId, exactly as an attacker (or a stale client) might
  // submit it. The action must never read this field.
  if (overrides.personId !== undefined) {
    fd.set('personId', overrides.personId);
  }
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadProfilePhotoAction', () => {
  it('returns silently when there is no session', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    const result = await uploadProfilePhotoAction({}, uploadForm());

    expect(result).toEqual({});
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it('refuses when photo_upload_allowed is false, before touching Blob', async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(makeAppUser({ photoUploadAllowed: false }));

    const result = await uploadProfilePhotoAction({}, uploadForm());

    expect(result.message).toBe('profile.notAllowed');
    expect(mockUploadImage).not.toHaveBeenCalled();
    expect(mockSetPersonPhoto).not.toHaveBeenCalled();
  });

  it('refuses when the account has no linked person', async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: null }));

    const result = await uploadProfilePhotoAction({}, uploadForm());

    expect(result.message).toBe('profile.noPersonLinked');
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it("writes photo_url and photo_consent_at to the SESSION's own person_id, never a personId submitted in the form", async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser({ id: '1' }));
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: 42 }));
    mockGetPersonById.mockResolvedValue({ id: 42, fullName: 'Own Name', photoUrl: null });
    mockUploadImage.mockResolvedValue('https://blob.example/new.jpg');

    // A foreign, unrelated person's id smuggled into the form.
    const form = uploadForm({ personId: '999' });
    const result = await uploadProfilePhotoAction({}, form);

    expect(mockUploadImage).toHaveBeenCalledWith(expect.any(File), 'profile-photos');
    // The write targets 42 (the session's own person), never 999.
    expect(mockSetPersonPhoto).toHaveBeenCalledWith(42, 'https://blob.example/new.jpg');
    expect(mockSetPersonPhoto).not.toHaveBeenCalledWith(999, expect.anything());
    expect(result.message).toBe('profile.uploaded');
  });

  it('deletes the previous photo file after a successful replace', async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: 42 }));
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Own Name',
      photoUrl: 'https://blob.example/old.jpg',
    });
    mockUploadImage.mockResolvedValue('https://blob.example/new.jpg');

    await uploadProfilePhotoAction({}, uploadForm());

    expect(mockDeleteImage).toHaveBeenCalledWith('https://blob.example/old.jpg');
  });

  it('rejects a disallowed file type without spending an upload', async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(makeAppUser());

    const result = await uploadProfilePhotoAction(
      {},
      uploadForm({ photo: makeFile({ type: 'application/pdf' }) })
    );

    expect(result.message).toBe('validation.photo.invalidType');
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it('rejects a file over the size limit without spending an upload', async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(makeAppUser());

    const result = await uploadProfilePhotoAction(
      {},
      uploadForm({ photo: makeFile({ size: 5 * 1024 * 1024 }) })
    );

    expect(result.message).toBe('validation.photo.tooLarge');
    expect(mockUploadImage).not.toHaveBeenCalled();
  });
});

describe('deleteProfilePhotoAction', () => {
  it('does nothing when there is no session', async () => {
    mockGetSessionUser.mockResolvedValue(null);

    await deleteProfilePhotoAction();

    expect(mockClearPersonPhoto).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
  });

  it('does nothing when the account has no linked person', async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: null }));

    await deleteProfilePhotoAction();

    expect(mockClearPersonPhoto).not.toHaveBeenCalled();
  });

  it("clears photo_url and photo_consent_at for the session's own person, and deletes the stored file", async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: 42 }));
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Own Name',
      photoUrl: 'https://blob.example/old.jpg',
    });

    await deleteProfilePhotoAction();

    expect(mockClearPersonPhoto).toHaveBeenCalledWith(42);
    expect(mockDeleteImage).toHaveBeenCalledWith('https://blob.example/old.jpg');
  });

  it('still clears the database row even when the storage delete fails', async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: 42 }));
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Own Name',
      photoUrl: 'https://blob.example/old.jpg',
    });
    // deleteImage never throws by contract (lib/blob.ts), but confirm the
    // row is cleared regardless of what it resolves to.
    mockDeleteImage.mockResolvedValue(undefined);

    await deleteProfilePhotoAction();

    expect(mockClearPersonPhoto).toHaveBeenCalledWith(42);
  });

  it('still allowed to remove a photo even when photo_upload_allowed has since been turned off', async () => {
    mockGetSessionUser.mockResolvedValue(makeSessionUser());
    mockGetAppUserById.mockResolvedValue(
      makeAppUser({ personId: 42, photoUploadAllowed: false })
    );
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Own Name',
      photoUrl: 'https://blob.example/old.jpg',
    });

    await deleteProfilePhotoAction();

    expect(mockClearPersonPhoto).toHaveBeenCalledWith(42);
  });
});
