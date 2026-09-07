import { describe, it, expect, vi, beforeEach } from 'vitest';

// These actions carry the entire guarantee of the photo-approval phase:
// `approved` must be computed on the SERVER from the activity's own
// organization, never from the form, and the upload must never be spent on
// a request that turns out to be unauthorized. Everything is mocked at the
// boundary (authz, the db reads/writes, blob, next/cache) so these tests
// prove ordering, the approved computation, and the admin/leader asymmetry
// without a real database, session, or Blob credential.
//
// NotAuthorizedError is the real class from lib/authz-rules.ts (which
// lib/authz.ts re-exports), not a local stand-in, so the catch blocks are
// proven to match the class the real module throws — same pattern as
// events-actions.test.ts.
vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return {
    requireLeaderOf: vi.fn(),
    requireAdmin: vi.fn(),
    NotAuthorizedError,
    getSessionUser: vi.fn().mockResolvedValue(null),
  };
});
vi.mock('./events-db', () => ({
  getEventOrganizationId: vi.fn(),
}));
vi.mock('./organizations-db', () => ({
  getOrganizationKeyById: vi.fn(),
}));
vi.mock('./event-photos-db', () => ({
  addEventPhoto: vi.fn(),
  approveEventPhoto: vi.fn(),
  deleteEventPhoto: vi.fn(),
  getPhotoEventId: vi.fn(),
  getPhotoUrl: vi.fn(),
}));
vi.mock('./blob', () => ({
  uploadImage: vi.fn(),
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

import { requireLeaderOf, requireAdmin } from './authz';
import { getEventOrganizationId } from './events-db';
import { getOrganizationKeyById } from './organizations-db';
import {
  addEventPhoto,
  approveEventPhoto,
  deleteEventPhoto,
  getPhotoEventId,
  getPhotoUrl,
} from './event-photos-db';
import { uploadImage, deleteImage } from './blob';
import {
  uploadEventPhotoAction,
  approveEventPhotoAction,
  deleteEventPhotoAction,
} from './event-photos-actions';

const mockRequireLeaderOf = vi.mocked(requireLeaderOf);
const mockRequireAdmin = vi.mocked(requireAdmin);
const mockGetEventOrganizationId = vi.mocked(getEventOrganizationId);
const mockGetOrganizationKeyById = vi.mocked(getOrganizationKeyById);
const mockAddEventPhoto = vi.mocked(addEventPhoto);
const mockApproveEventPhoto = vi.mocked(approveEventPhoto);
const mockDeleteEventPhoto = vi.mocked(deleteEventPhoto);
const mockGetPhotoEventId = vi.mocked(getPhotoEventId);
const mockGetPhotoUrl = vi.mocked(getPhotoUrl);
const mockUploadImage = vi.mocked(uploadImage);
const mockDeleteImage = vi.mocked(deleteImage);

function makeFile(): File {
  return new File([new Uint8Array(10)], 'photo.jpg', { type: 'image/jpeg' });
}

function uploadForm(overrides: Partial<{ eventId: string; photo: File | null; caption: string }> = {}): FormData {
  const fd = new FormData();
  fd.set('eventId', overrides.eventId ?? '5');
  if (overrides.photo !== null) {
    fd.set('photo', overrides.photo ?? makeFile());
  }
  fd.set('caption', overrides.caption ?? 'A caption');
  return fd;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('uploadEventPhotoAction', () => {
  it('resolves the organization before asking permission (call order)', async () => {
    const calls: string[] = [];
    mockGetEventOrganizationId.mockImplementation(async () => {
      calls.push('resolveOrganization');
      return 3;
    });
    mockRequireLeaderOf.mockImplementation(async () => {
      calls.push('requirePermission');
      return { id: '1', role: 'leader', organizationId: 3 };
    });
    mockGetOrganizationKeyById.mockResolvedValue('relief_society');
    mockUploadImage.mockResolvedValue('https://blob.example/photo.jpg');
    mockAddEventPhoto.mockResolvedValue(1);

    await uploadEventPhotoAction(uploadForm());

    expect(calls).toEqual(['resolveOrganization', 'requirePermission']);
  });

  it('never uploads the file when permission is denied', async () => {
    mockGetEventOrganizationId.mockResolvedValue(3);
    // The real class, not a fake, since the action's catch block matches on
    // `instanceof`.
    const { NotAuthorizedError } = await import('./authz-rules');
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    await uploadEventPhotoAction(uploadForm());

    expect(mockUploadImage).not.toHaveBeenCalled();
    expect(mockAddEventPhoto).not.toHaveBeenCalled();
  });

  it('exits silently for an activity that does not exist, without uploading', async () => {
    mockGetEventOrganizationId.mockResolvedValue(undefined);

    await uploadEventPhotoAction(uploadForm());

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockUploadImage).not.toHaveBeenCalled();
  });

  it('inserts a Primary activity photo with approved = false', async () => {
    mockGetEventOrganizationId.mockResolvedValue(3);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 3 });
    mockGetOrganizationKeyById.mockResolvedValue('primary');
    mockUploadImage.mockResolvedValue('https://blob.example/primary.jpg');
    mockAddEventPhoto.mockResolvedValue(1);

    await uploadEventPhotoAction(uploadForm({ eventId: '3' }));

    expect(mockAddEventPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ approved: false })
    );
  });

  it('inserts a Relief Society activity photo with approved = true', async () => {
    mockGetEventOrganizationId.mockResolvedValue(3);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 3 });
    mockGetOrganizationKeyById.mockResolvedValue('relief_society');
    mockUploadImage.mockResolvedValue('https://blob.example/rs.jpg');
    mockAddEventPhoto.mockResolvedValue(1);

    await uploadEventPhotoAction(uploadForm({ eventId: '3' }));

    expect(mockAddEventPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ approved: true })
    );
  });

  it('treats a whole-branch activity (null organization) as needing approval', async () => {
    mockGetEventOrganizationId.mockResolvedValue(null);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });
    mockUploadImage.mockResolvedValue('https://blob.example/branch.jpg');
    mockAddEventPhoto.mockResolvedValue(1);

    await uploadEventPhotoAction(uploadForm());

    expect(mockGetOrganizationKeyById).not.toHaveBeenCalled();
    expect(mockAddEventPhoto).toHaveBeenCalledWith(
      expect.objectContaining({ approved: false })
    );
  });

  it('does not insert a row when the upload produced no url', async () => {
    mockGetEventOrganizationId.mockResolvedValue(3);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 3 });
    mockUploadImage.mockResolvedValue(null);

    await uploadEventPhotoAction(uploadForm());

    expect(mockAddEventPhoto).not.toHaveBeenCalled();
  });

  it('exits silently for a malformed activity id', async () => {
    await uploadEventPhotoAction(uploadForm({ eventId: 'not-a-number' }));

    expect(mockGetEventOrganizationId).not.toHaveBeenCalled();
    expect(mockUploadImage).not.toHaveBeenCalled();
  });
});

describe('approveEventPhotoAction', () => {
  function approveForm(id = '7'): FormData {
    const fd = new FormData();
    fd.set('id', id);
    return fd;
  }

  it('calls requireAdmin and never requireLeaderOf', async () => {
    mockGetPhotoEventId.mockResolvedValue(9);
    mockRequireAdmin.mockResolvedValue({ id: '2', role: 'admin', organizationId: null });

    await approveEventPhotoAction(approveForm());

    expect(mockRequireAdmin).toHaveBeenCalledTimes(1);
    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockApproveEventPhoto).toHaveBeenCalledWith(7, 2);
  });

  it('exits silently when the admin check fails', async () => {
    mockGetPhotoEventId.mockResolvedValue(9);
    const { NotAuthorizedError } = await import('./authz-rules');
    mockRequireAdmin.mockRejectedValue(new NotAuthorizedError());

    await approveEventPhotoAction(approveForm());

    expect(mockApproveEventPhoto).not.toHaveBeenCalled();
  });

  it('exits silently for a photo that does not exist', async () => {
    mockGetPhotoEventId.mockResolvedValue(undefined);

    await approveEventPhotoAction(approveForm());

    expect(mockRequireAdmin).not.toHaveBeenCalled();
    expect(mockApproveEventPhoto).not.toHaveBeenCalled();
  });
});

describe('deleteEventPhotoAction', () => {
  function deleteForm(id = '11'): FormData {
    const fd = new FormData();
    fd.set('id', id);
    return fd;
  }

  it('deletes both the row and the stored file', async () => {
    mockGetPhotoEventId.mockResolvedValue(4);
    mockGetEventOrganizationId.mockResolvedValue(6);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 6 });
    mockGetPhotoUrl.mockResolvedValue('https://blob.example/old.jpg');

    await deleteEventPhotoAction(deleteForm());

    expect(mockDeleteEventPhoto).toHaveBeenCalledWith(11);
    expect(mockDeleteImage).toHaveBeenCalledWith('https://blob.example/old.jpg');
  });

  it('resolves the activity before asking permission (call order)', async () => {
    const calls: string[] = [];
    mockGetPhotoEventId.mockImplementation(async () => {
      calls.push('resolvePhotoEvent');
      return 4;
    });
    mockGetEventOrganizationId.mockImplementation(async () => {
      calls.push('resolveOrganization');
      return 6;
    });
    mockRequireLeaderOf.mockImplementation(async () => {
      calls.push('requirePermission');
      return { id: '1', role: 'leader', organizationId: 6 };
    });
    mockGetPhotoUrl.mockResolvedValue(undefined);

    await deleteEventPhotoAction(deleteForm());

    expect(calls).toEqual(['resolvePhotoEvent', 'resolveOrganization', 'requirePermission']);
  });

  it('does not delete anything when permission is denied', async () => {
    mockGetPhotoEventId.mockResolvedValue(4);
    mockGetEventOrganizationId.mockResolvedValue(6);
    const { NotAuthorizedError } = await import('./authz-rules');
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    await deleteEventPhotoAction(deleteForm());

    expect(mockDeleteEventPhoto).not.toHaveBeenCalled();
    expect(mockDeleteImage).not.toHaveBeenCalled();
  });

  it('exits silently for a photo that does not exist', async () => {
    mockGetPhotoEventId.mockResolvedValue(undefined);

    await deleteEventPhotoAction(deleteForm());

    expect(mockGetEventOrganizationId).not.toHaveBeenCalled();
    expect(mockDeleteEventPhoto).not.toHaveBeenCalled();
  });
});
