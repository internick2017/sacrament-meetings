import { describe, it, expect, vi, beforeEach } from 'vitest';

// Focused on deleteUserAction's photo cleanup (Findings 3 and 4 of the final
// review): deleting an account must not leave its linked person's profile
// photo published with nobody now able to remove it, and must not leave the
// stored file orphaned at its public URL. Everything else in this file is
// mocked at the boundary, same pattern as lib/events-actions.test.ts.
vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return {
    requireAdmin: vi.fn(),
    NotAuthorizedError,
  };
});
vi.mock('./users-db', () => ({
  addUser: vi.fn(),
  updateUserRole: vi.fn(),
  updateUserPhotoUploadAllowed: vi.fn(),
  deleteUser: vi.fn(),
  getAppUserById: vi.fn(),
}));
vi.mock('./organizations-db', () => ({
  getOrganizationIdByKey: vi.fn(),
}));
vi.mock('./people-db', () => ({
  getPersonById: vi.fn(),
  clearPersonPhoto: vi.fn(),
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
import { deleteUser, getAppUserById } from './users-db';
import { getPersonById, clearPersonPhoto } from './people-db';
import { deleteImage } from './blob';
import { deleteUserAction } from './users-actions';
import type { AppUser } from './users-db';

const mockRequireAdmin = vi.mocked(requireAdmin);
const mockDeleteUser = vi.mocked(deleteUser);
const mockGetAppUserById = vi.mocked(getAppUserById);
const mockGetPersonById = vi.mocked(getPersonById);
const mockClearPersonPhoto = vi.mocked(clearPersonPhoto);
const mockDeleteImage = vi.mocked(deleteImage);

function formWithId(id: number): FormData {
  const fd = new FormData();
  fd.set('id', String(id));
  return fd;
}

function makeAppUser(overrides: Partial<AppUser> = {}): AppUser {
  return {
    id: 5,
    username: null,
    email: 'member@example.com',
    role: 'member',
    organizationId: null,
    personId: 42,
    photoUploadAllowed: false,
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRequireAdmin.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });
});

describe('deleteUserAction', () => {
  it('clears the linked person\'s photo (row and stored file) before deleting the account', async () => {
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: 42 }));
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Deleted Member',
      photoUrl: 'https://blob.example/old.jpg',
    });

    await deleteUserAction(formWithId(5));

    expect(mockClearPersonPhoto).toHaveBeenCalledWith(42);
    expect(mockDeleteImage).toHaveBeenCalledWith('https://blob.example/old.jpg');
    expect(mockDeleteUser).toHaveBeenCalledWith(5);
  });

  it('does nothing photo-related when the account has no linked person', async () => {
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: null }));

    await deleteUserAction(formWithId(5));

    expect(mockClearPersonPhoto).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
    expect(mockDeleteUser).toHaveBeenCalledWith(5);
  });

  it('still deletes the account even when the storage delete fails', async () => {
    mockGetAppUserById.mockResolvedValue(makeAppUser({ personId: 42 }));
    mockGetPersonById.mockResolvedValue({
      id: 42,
      fullName: 'Deleted Member',
      photoUrl: 'https://blob.example/old.jpg',
    });
    mockDeleteImage.mockRejectedValue(new Error('storage unavailable'));

    await expect(deleteUserAction(formWithId(5))).resolves.toBeUndefined();

    expect(mockClearPersonPhoto).toHaveBeenCalledWith(42);
    expect(mockDeleteUser).toHaveBeenCalledWith(5);
  });

  it('never deletes when the caller is not an admin', async () => {
    mockRequireAdmin.mockRejectedValue(new NotAuthorizedError());

    await deleteUserAction(formWithId(5));

    expect(mockDeleteUser).not.toHaveBeenCalled();
    expect(mockClearPersonPhoto).not.toHaveBeenCalled();
  });

  it('an admin cannot delete their own account, and no photo cleanup runs for it', async () => {
    mockRequireAdmin.mockResolvedValue({ id: '5', role: 'admin', organizationId: null });

    await deleteUserAction(formWithId(5));

    expect(mockGetAppUserById).not.toHaveBeenCalled();
    expect(mockDeleteUser).not.toHaveBeenCalled();
  });
});
