import { describe, it, expect, vi, beforeEach } from 'vitest';

// adminRemovePersonPhotoAction is REMOVAL ONLY, by design (see the comment
// in lib/people-actions.ts): an admin choosing a photo FOR someone else
// would be collection, not consent. There must never be an admin "set
// photo" counterpart, so this file also asserts the module exports nothing
// that could add a photo on someone else's behalf.
vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return {
    requireAdmin: vi.fn(),
    NotAuthorizedError,
  };
});
vi.mock('./people-db', () => ({
  getPersonById: vi.fn(),
  clearPersonPhoto: vi.fn(),
  personHasCurrentCalling: vi.fn(),
  deletePerson: vi.fn(),
}));
vi.mock('./blob', () => ({
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));

import { requireAdmin, NotAuthorizedError } from './authz';
import { getPersonById, clearPersonPhoto, personHasCurrentCalling, deletePerson } from './people-db';
import { deleteImage } from './blob';
import { adminRemovePersonPhotoAction, adminRemovePersonAction } from './people-actions';
import * as peopleActions from './people-actions';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockGetPersonById = vi.mocked(getPersonById);
const mockClearPersonPhoto = vi.mocked(clearPersonPhoto);
const mockDeleteImage = vi.mocked(deleteImage);
const mockPersonHasCurrentCalling = vi.mocked(personHasCurrentCalling);
const mockDeletePerson = vi.mocked(deletePerson);

function formWithPersonId(id: number | string): FormData {
  const fd = new FormData();
  fd.set('personId', String(id));
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adminRemovePersonPhotoAction', () => {
  it('never touches the database when the caller is not an admin', async () => {
    mockRequireAdmin.mockRejectedValue(new NotAuthorizedError());

    await adminRemovePersonPhotoAction(formWithPersonId(42));

    expect(mockClearPersonPhoto).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
  });

  it('rejects a missing, zero, or non-integer personId without checking permission', async () => {
    for (const bad of ['', '0', '-1', 'abc']) {
      await adminRemovePersonPhotoAction(formWithPersonId(bad));
    }
    expect(mockRequireAdmin).not.toHaveBeenCalled();
    expect(mockClearPersonPhoto).not.toHaveBeenCalled();
  });

  it("clears photo_url and photo_consent_at (via clearPersonPhoto) for the given person, and deletes the stored file", async () => {
    mockRequireAdmin.mockResolvedValue({ id: '9', role: 'admin', organizationId: null });
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Someone',
      photoUrl: 'https://blob.example/someone.jpg',
    });

    await adminRemovePersonPhotoAction(formWithPersonId(42));

    expect(mockClearPersonPhoto).toHaveBeenCalledWith(42);
    expect(mockDeleteImage).toHaveBeenCalledWith('https://blob.example/someone.jpg');
  });

  it('still clears the row even when the storage delete rejects', async () => {
    mockRequireAdmin.mockResolvedValue({ id: '9', role: 'admin', organizationId: null });
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Someone',
      photoUrl: 'https://blob.example/someone.jpg',
    });
    mockDeleteImage.mockRejectedValue(new Error('storage unavailable'));

    await expect(adminRemovePersonPhotoAction(formWithPersonId(42))).resolves.toBeUndefined();

    expect(mockClearPersonPhoto).toHaveBeenCalledWith(42);
  });

  // The asymmetry the reviewer called out by name: an admin may REMOVE a
  // person's photo, and there is no code path anywhere in this module (or
  // this file's exports) that lets an admin ADD or REPLACE one for someone
  // else. setPersonPhoto (the only function that writes a new photo_url) is
  // never imported here.
  it('exposes no admin action capable of setting a photo for someone else', () => {
    const exportNames = Object.keys(peopleActions);
    expect(exportNames.sort()).toEqual(['adminRemovePersonAction', 'adminRemovePersonPhotoAction']);
    for (const name of exportNames) {
      expect(name.toLowerCase()).not.toContain('upload');
      // "set" is checked with a word-ish boundary via not-contain on the raw
      // name; "adminRemovePersonAction" itself contains no "set" substring,
      // so this still guards against a future adminSetPersonPhoto-style export.
      expect(name.toLowerCase()).not.toContain('set');
    }
  });
});

function formWithPersonId2(id: number | string): FormData {
  const fd = new FormData();
  fd.set('personId', String(id));
  return fd;
}

describe('adminRemovePersonAction', () => {
  it('never touches the database when the caller is not an admin', async () => {
    mockRequireAdmin.mockRejectedValue(new NotAuthorizedError());

    const result = await adminRemovePersonAction({ ok: false }, formWithPersonId2(42));

    expect(result.ok).toBe(false);
    expect(mockPersonHasCurrentCalling).not.toHaveBeenCalled();
    expect(mockDeletePerson).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
  });

  it('never touches the database for a leader or a member (not just non-admins in general)', async () => {
    for (const role of ['leader', 'member'] as const) {
      mockRequireAdmin.mockReset();
      mockRequireAdmin.mockRejectedValue(new NotAuthorizedError());

      const result = await adminRemovePersonAction({ ok: false }, formWithPersonId2(42));

      expect(result.ok).toBe(false);
      expect(mockDeletePerson).not.toHaveBeenCalled();
      void role;
    }
  });

  it('rejects a missing, zero, or non-integer personId without checking permission', async () => {
    for (const bad of ['', '0', '-1', 'abc']) {
      const result = await adminRemovePersonAction({ ok: false }, formWithPersonId2(bad));
      expect(result.ok).toBe(false);
    }
    expect(mockRequireAdmin).not.toHaveBeenCalled();
    expect(mockDeletePerson).not.toHaveBeenCalled();
  });

  it('refuses when the person still holds a current calling, and never deletes', async () => {
    mockRequireAdmin.mockResolvedValue({ id: '9', role: 'admin', organizationId: null });
    mockPersonHasCurrentCalling.mockResolvedValue(true);

    const result = await adminRemovePersonAction({ ok: false }, formWithPersonId2(42));

    expect(result.ok).toBe(false);
    expect(result.message).toBeTruthy();
    expect(mockDeletePerson).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
  });

  it('removes a person with no current calling: deletes the row and attempts to delete the stored photo', async () => {
    mockRequireAdmin.mockResolvedValue({ id: '9', role: 'admin', organizationId: null });
    mockPersonHasCurrentCalling.mockResolvedValue(false);
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Someone',
      photoUrl: 'https://blob.example/someone.jpg',
    });
    mockDeletePerson.mockResolvedValue(true);

    const result = await adminRemovePersonAction({ ok: false }, formWithPersonId2(42));

    expect(result.ok).toBe(true);
    expect(mockDeletePerson).toHaveBeenCalledWith(42);
    expect(mockDeleteImage).toHaveBeenCalledWith('https://blob.example/someone.jpg');
  });

  it('still deletes the person even when the storage delete rejects', async () => {
    mockRequireAdmin.mockResolvedValue({ id: '9', role: 'admin', organizationId: null });
    mockPersonHasCurrentCalling.mockResolvedValue(false);
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Someone',
      photoUrl: 'https://blob.example/someone.jpg',
    });
    mockDeleteImage.mockRejectedValue(new Error('storage unavailable'));
    mockDeletePerson.mockResolvedValue(true);

    const result = await adminRemovePersonAction({ ok: false }, formWithPersonId2(42));

    expect(result.ok).toBe(true);
    expect(mockDeletePerson).toHaveBeenCalledWith(42);
  });
});
