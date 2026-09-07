import { describe, it, expect, vi, beforeEach } from 'vitest';

// These actions must get the ordering right: addEventAction resolves the
// organization BEFORE asking permission (so a leader cannot probe another
// organization's key before we know which one it is), and
// updateEventAction/deleteEventAction resolve the activity's CURRENT
// organization before asking permission at all (so a leader cannot act on
// another organization's activity by guessing its id). updateEventAction
// additionally must check permission on BOTH the current and the submitted
// organization when the form moves an activity between organizations, which
// is the defect a reviewer is most likely to find if it is missing.
// Everything is mocked at the boundary (authz, the db reads/writes,
// next/cache, i18n) so these tests prove the ordering and error handling
// without a real database or session. NotAuthorizedError is the real class
// from lib/authz-rules.ts (which lib/authz.ts re-exports), not a local
// stand-in, so the catch block is proven to match the class the real module
// throws.
vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return {
    requireLeaderOf: vi.fn(),
    NotAuthorizedError,
    getSessionUser: vi.fn().mockResolvedValue(null),
  };
});
vi.mock('./organizations-db', () => ({
  getOrganizationIdByKey: vi.fn(),
  getOrganizationKeyById: vi.fn(),
}));
vi.mock('./events-db', () => ({
  addEvent: vi.fn(),
  updateEvent: vi.fn(),
  deleteEvent: vi.fn(),
  getEventOrganizationId: vi.fn(),
  getEventCoverUrl: vi.fn(),
}));
vi.mock('./event-photos-db', () => ({
  resetEventPhotosApproval: vi.fn(),
  getEventPhotoUrls: vi.fn().mockResolvedValue([]),
}));
// uploadCover is exercised directly in blob.test.ts (its own rejection
// paths: bad type, too large, upload disabled, upload throws). Here it is
// mocked so events-actions.test.ts stays focused on ordering and the
// carry-forward/replace/remove decision, independent of @vercel/blob.
vi.mock('./blob', () => ({
  uploadCover: vi.fn().mockResolvedValue(null),
  deleteCover: vi.fn().mockResolvedValue(undefined),
  deleteImage: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
// redirect() throws NEXT_REDIRECT in real Next.js; mocked as a plain spy
// here since these tests only need to assert it was called with the right
// path, not exercise the real navigation short-circuit.
vi.mock('next/navigation', () => ({
  redirect: vi.fn(),
}));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));
// updateEventAction and addEventAction now convert the submitted naive
// local time using the congregation's timezone (see lib/timezone.ts), which
// means they read the unit. Mocked here so these tests stay a pure
// unit/permission-ordering check, independent of that conversion (which has
// its own dedicated tests in lib/timezone.test.ts).
vi.mock('./unit-db', () => ({
  getUnit: vi.fn().mockResolvedValue({ timezone: 'America/Sao_Paulo' }),
}));

import { requireLeaderOf, NotAuthorizedError } from './authz';
import { getOrganizationIdByKey, getOrganizationKeyById } from './organizations-db';
import {
  addEvent,
  updateEvent,
  deleteEvent,
  getEventOrganizationId,
  getEventCoverUrl,
} from './events-db';
import { resetEventPhotosApproval, getEventPhotoUrls } from './event-photos-db';
import { redirect } from 'next/navigation';
import { uploadCover, deleteCover, deleteImage } from './blob';
import { addEventAction, updateEventAction, deleteEventAction } from './events-actions';

const mockRequireLeaderOf = vi.mocked(requireLeaderOf);
const mockGetOrganizationIdByKey = vi.mocked(getOrganizationIdByKey);
const mockGetOrganizationKeyById = vi.mocked(getOrganizationKeyById);
const mockAddEvent = vi.mocked(addEvent);
const mockUpdateEvent = vi.mocked(updateEvent);
const mockDeleteEvent = vi.mocked(deleteEvent);
const mockGetEventOrganizationId = vi.mocked(getEventOrganizationId);
const mockGetEventCoverUrl = vi.mocked(getEventCoverUrl);
const mockResetEventPhotosApproval = vi.mocked(resetEventPhotosApproval);
const mockGetEventPhotoUrls = vi.mocked(getEventPhotoUrls);
const mockRedirect = vi.mocked(redirect);
const mockUploadCover = vi.mocked(uploadCover);
const mockDeleteCover = vi.mocked(deleteCover);
const mockDeleteImage = vi.mocked(deleteImage);

function formWithId(id: number): FormData {
  const fd = new FormData();
  fd.set('id', String(id));
  return fd;
}

const baseValues = {
  organizationKey: 'relief_society',
  title: 'Noche de hogar',
  description: '',
  location: 'Capilla',
  startsAt: '2026-10-02T19:00',
  endsAt: '',
  audience: 'public',
};

function formWithValues(values: Record<string, string>, id?: number): FormData {
  const fd = new FormData();
  if (id !== undefined) {
    fd.set('id', String(id));
  }
  for (const [key, value] of Object.entries(values)) {
    fd.set(key, value);
  }
  // allDay omitted: an unchecked checkbox is simply absent from the form.
  return fd;
}

beforeEach(() => {
  mockRequireLeaderOf.mockReset();
  mockGetOrganizationIdByKey.mockReset();
  mockGetOrganizationKeyById.mockReset();
  mockAddEvent.mockReset();
  mockUpdateEvent.mockReset();
  mockDeleteEvent.mockReset();
  mockGetEventOrganizationId.mockReset();
  mockGetEventCoverUrl.mockReset();
  mockResetEventPhotosApproval.mockReset();
  mockGetEventPhotoUrls.mockReset();
  mockGetEventPhotoUrls.mockResolvedValue([]);
  mockUploadCover.mockReset();
  mockUploadCover.mockResolvedValue(null);
  mockDeleteCover.mockReset();
  mockDeleteCover.mockResolvedValue(undefined);
  mockDeleteImage.mockReset();
  mockDeleteImage.mockResolvedValue(undefined);
  mockGetEventCoverUrl.mockResolvedValue(null);
});

describe('addEventAction', () => {
  it('resolves the organization from the submitted key before asking permission with the resolved id', async () => {
    const calls: string[] = [];
    mockGetOrganizationIdByKey.mockImplementation(async (key) => {
      calls.push(`lookup:${key}`);
      return 60;
    });
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      calls.push(`permission:${organizationId}`);
      return { id: '1', role: 'leader', organizationId: 60 };
    });

    await addEventAction({}, formWithValues(baseValues));

    expect(calls).toEqual(['lookup:relief_society', 'permission:60']);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(60);
    expect(mockAddEvent).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 60 }),
      null
    );
  });

  it('resolves an empty organizationKey to null (branch-wide) before asking permission', async () => {
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });

    await addEventAction({}, formWithValues({ ...baseValues, organizationKey: '' }));

    expect(mockGetOrganizationIdByKey).not.toHaveBeenCalled();
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(null);
    expect(mockAddEvent).toHaveBeenCalledWith(expect.objectContaining({ organizationId: null }), null);
  });

  it('swallows NotAuthorizedError and does not write', async () => {
    mockGetOrganizationIdByKey.mockResolvedValue(60);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    const result = await addEventAction({}, formWithValues(baseValues));

    expect(result.message).toBe('admin.notAllowed');
    expect(mockAddEvent).not.toHaveBeenCalled();
  });

  it('redirects to the new activity, using the id addEvent returns, so a leader who just created it can see it', async () => {
    mockGetOrganizationIdByKey.mockResolvedValue(60);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 60 });
    mockAddEvent.mockResolvedValue(42);

    await addEventAction({}, formWithValues(baseValues));

    expect(mockRedirect).toHaveBeenCalledWith('/activities/42');
  });
});

describe('deleteEventAction', () => {
  it('resolves the organization before asking permission, then acts', async () => {
    const calls: string[] = [];
    mockGetEventOrganizationId.mockImplementation(async () => {
      calls.push('lookup');
      return 30;
    });
    mockRequireLeaderOf.mockImplementation(async () => {
      calls.push('permission');
      return { id: '1', role: 'leader', organizationId: 30 };
    });

    await deleteEventAction(formWithId(5));

    expect(calls).toEqual(['lookup', 'permission']);
    expect(mockGetEventOrganizationId).toHaveBeenCalledWith(5);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(30);
    expect(mockDeleteEvent).toHaveBeenCalledWith(5);
  });

  it('returns silently, without checking permission, when the activity does not exist', async () => {
    mockGetEventOrganizationId.mockResolvedValue(undefined);

    await deleteEventAction(formWithId(999));

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it('swallows NotAuthorizedError instead of letting it escape as a 500', async () => {
    mockGetEventOrganizationId.mockResolvedValue(30);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    await expect(deleteEventAction(formWithId(5))).resolves.toBeUndefined();
    expect(mockDeleteEvent).not.toHaveBeenCalled();
  });

  it('deletes the cover from Blob storage when the activity is deleted', async () => {
    mockGetEventOrganizationId.mockResolvedValue(30);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 30 });
    mockGetEventCoverUrl.mockResolvedValue('https://example.public.blob.vercel-storage.com/old.jpg');

    await deleteEventAction(formWithId(5));

    expect(mockDeleteEvent).toHaveBeenCalledWith(5);
    expect(mockDeleteCover).toHaveBeenCalledWith('https://example.public.blob.vercel-storage.com/old.jpg');
  });

  // Finding 4 of the final review: deleting an activity cascades its
  // event_photos rows, but without this the photo FILES stayed behind at
  // their public, unguessable-but-reachable URLs forever.
  it('deletes every photo file from Blob storage when the activity is deleted', async () => {
    mockGetEventOrganizationId.mockResolvedValue(30);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 30 });
    mockGetEventPhotoUrls.mockResolvedValue([
      'https://example.public.blob.vercel-storage.com/photo1.jpg',
      'https://example.public.blob.vercel-storage.com/photo2.jpg',
    ]);

    await deleteEventAction(formWithId(5));

    expect(mockDeleteEvent).toHaveBeenCalledWith(5);
    expect(mockDeleteImage).toHaveBeenCalledWith(
      'https://example.public.blob.vercel-storage.com/photo1.jpg'
    );
    expect(mockDeleteImage).toHaveBeenCalledWith(
      'https://example.public.blob.vercel-storage.com/photo2.jpg'
    );
  });
});

describe('updateEventAction', () => {
  it('returns silently when the activity does not exist, without checking permission', async () => {
    mockGetEventOrganizationId.mockResolvedValue(undefined);

    await updateEventAction({}, formWithValues(baseValues, 999));

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('checks permission on both organizations when the form moves the activity, and only then writes', async () => {
    // Activity currently belongs to org 10; the form submits org 20.
    const calls: string[] = [];
    mockGetEventOrganizationId.mockImplementation(async () => {
      calls.push('lookup-current');
      return 10;
    });
    mockGetOrganizationIdByKey.mockImplementation(async (key) => {
      calls.push(`lookup-new:${key}`);
      return 20;
    });
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      calls.push(`permission:${organizationId}`);
      return { id: '1', role: 'admin', organizationId: null };
    });

    await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(calls).toEqual(['lookup-current', 'lookup-new:young_men', 'permission:10', 'permission:20']);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(10);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(20);
    expect(mockUpdateEvent).toHaveBeenCalledWith(7, expect.objectContaining({ organizationId: 20 }));
  });

  it('rejects the move when the caller may edit the current organization but not the new one', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(20);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 10) {
        return { id: '1', role: 'leader', organizationId: 10 };
      }
      throw new NotAuthorizedError();
    });

    const result = await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('rejects the move when the caller may edit the new organization but not the current one (stealing another org\'s activity)', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(20);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 20) {
        return { id: '1', role: 'leader', organizationId: 20 };
      }
      throw new NotAuthorizedError();
    });

    const result = await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('a leader cannot turn their own activity into a branch-wide one, because requireLeaderOf(null) fails for them', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 10) {
        return { id: '1', role: 'leader', organizationId: 10 };
      }
      // organizationId === null: a leader is never the leader of "no
      // organization", so this rejects exactly like the real rule does.
      throw new NotAuthorizedError();
    });

    const result = await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: '' }, 7)
    );

    expect(mockGetOrganizationIdByKey).not.toHaveBeenCalled();
    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateEvent).not.toHaveBeenCalled();
  });

  it('resolves and checks permission before writing when the organization is unchanged', async () => {
    const calls: string[] = [];
    mockGetEventOrganizationId.mockImplementation(async () => {
      calls.push('lookup-current');
      return 10;
    });
    mockGetOrganizationIdByKey.mockImplementation(async () => {
      calls.push('lookup-new');
      return 10;
    });
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      calls.push(`permission:${organizationId}`);
      return { id: '1', role: 'leader', organizationId: 10 };
    });

    await updateEventAction({}, formWithValues(baseValues, 7));

    expect(calls[calls.length - 2]).toBe('permission:10');
    expect(calls[calls.length - 1]).toBe('permission:10');
    expect(mockUpdateEvent).toHaveBeenCalledWith(7, expect.objectContaining({ organizationId: 10 }));
  });

  it('redirects to the activity detail page after a successful update, so the form does not show stale values', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 10 });

    await updateEventAction({}, formWithValues(baseValues, 7));

    expect(mockRedirect).toHaveBeenCalledWith('/activities/7');
  });

  // These three pin down the trap the two earlier reviews flagged: this
  // action used to hardcode coverUrl: null, so saving a plain text edit
  // silently deleted the activity's cover image.
  it('carries the existing cover forward when no file is chosen and removal is not requested', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 10 });
    mockUploadCover.mockResolvedValue(null); // no file chosen
    mockGetEventCoverUrl.mockResolvedValue('https://example.public.blob.vercel-storage.com/old.jpg');

    await updateEventAction({}, formWithValues(baseValues, 7));

    expect(mockGetEventCoverUrl).toHaveBeenCalledWith(7);
    expect(mockUpdateEvent).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ coverUrl: 'https://example.public.blob.vercel-storage.com/old.jpg' })
    );
    // The cover carried forward unchanged: nothing to delete.
    expect(mockDeleteCover).not.toHaveBeenCalled();
  });

  it('replaces the cover when uploadCover returns a new url, and deletes the old file from Blob storage', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 10 });
    mockUploadCover.mockResolvedValue('https://example.public.blob.vercel-storage.com/new.jpg');
    mockGetEventCoverUrl.mockResolvedValue('https://example.public.blob.vercel-storage.com/old.jpg');

    await updateEventAction({}, formWithValues(baseValues, 7));

    expect(mockUpdateEvent).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ coverUrl: 'https://example.public.blob.vercel-storage.com/new.jpg' })
    );
    expect(mockDeleteCover).toHaveBeenCalledWith('https://example.public.blob.vercel-storage.com/old.jpg');
  });

  it('clears the cover when removeCover is checked and no new file is chosen, deleting the old file', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 10 });
    mockUploadCover.mockResolvedValue(null);
    mockGetEventCoverUrl.mockResolvedValue('https://example.public.blob.vercel-storage.com/old.jpg');

    await updateEventAction(
      {},
      formWithValues({ ...baseValues, removeCover: 'on' }, 7)
    );

    expect(mockUpdateEvent).toHaveBeenCalledWith(7, expect.objectContaining({ coverUrl: null }));
    expect(mockDeleteCover).toHaveBeenCalledWith('https://example.public.blob.vercel-storage.com/old.jpg');
  });

  it('calls uploadCover only after permission is granted, never spending an upload on a rejected request', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    await updateEventAction({}, formWithValues(baseValues, 7));

    expect(mockUploadCover).not.toHaveBeenCalled();
  });

  it('reports the same message for a forbidden activity as for a missing one', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    const forbidden = await updateEventAction({}, formWithValues(baseValues, 7));

    mockGetEventOrganizationId.mockResolvedValue(undefined);
    const missing = await updateEventAction({}, formWithValues(baseValues, 999));

    expect(forbidden.message).toBe(missing.message);
  });

  // Finding 2 of the final review: `approved` is frozen at upload time, so
  // moving an activity INTO an organization that requires approval must
  // re-close the gate on its already-approved photos, or they stay
  // published under a classification the bishopric never reviewed them
  // against.
  it('resets photo approval when the activity moves into an organization that requires approval', async () => {
    mockGetEventOrganizationId.mockResolvedValue(10); // relief_society, no approval needed
    mockGetOrganizationIdByKey.mockResolvedValue(20); // young_men
    mockGetOrganizationKeyById.mockResolvedValue('young_men');
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });

    await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(mockResetEventPhotosApproval).toHaveBeenCalledWith(7);
  });

  it('does not reset photo approval when the organization does not change, even if it requires approval', async () => {
    mockGetEventOrganizationId.mockResolvedValue(20); // already young_men
    mockGetOrganizationIdByKey.mockResolvedValue(20);
    mockGetOrganizationKeyById.mockResolvedValue('young_men');
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 20 });

    await updateEventAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(mockResetEventPhotosApproval).not.toHaveBeenCalled();
  });

  it('does not reset photo approval when the activity moves OUT of an organization that requires approval', async () => {
    mockGetEventOrganizationId.mockResolvedValue(20); // young_men
    mockGetOrganizationIdByKey.mockResolvedValue(10); // relief_society
    mockGetOrganizationKeyById.mockResolvedValue('relief_society');
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });

    await updateEventAction({}, formWithValues(baseValues, 7));

    expect(mockResetEventPhotosApproval).not.toHaveBeenCalled();
  });

  it('rejects an id that is missing, empty, zero, or not an integer, without checking permission', async () => {
    for (const badId of ['', '0', '-1', 'abc', '1.5']) {
      const fd = new FormData();
      fd.set('id', badId);
      for (const [key, value] of Object.entries(baseValues)) {
        fd.set(key, value);
      }
      const result = await updateEventAction({}, fd);
      expect(result.message).toBe('validation.fixFields');
    }
    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
  });
});
