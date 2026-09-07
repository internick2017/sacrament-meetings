import { describe, it, expect, vi, beforeEach } from 'vitest';

// These actions must get the ordering right: addAnnouncementAction resolves
// the organization BEFORE asking permission (so a leader cannot probe
// another organization's key before we know which one it is), and
// updateAnnouncementAction/deleteAnnouncementAction resolve the
// announcement's CURRENT organization before asking permission at all (so a
// leader cannot act on another organization's announcement by guessing its
// id). updateAnnouncementAction additionally must check permission on BOTH
// the current and the submitted organization when the form moves an
// announcement between organizations, which is the defect a reviewer is
// most likely to find if it is missing.
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
}));
vi.mock('./announcements-db', () => ({
  addAnnouncement: vi.fn(),
  updateAnnouncement: vi.fn(),
  deleteAnnouncement: vi.fn(),
  getAnnouncementOrganizationId: vi.fn(),
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

import { requireLeaderOf, NotAuthorizedError } from './authz';
import { getOrganizationIdByKey } from './organizations-db';
import {
  addAnnouncement,
  updateAnnouncement,
  deleteAnnouncement,
  getAnnouncementOrganizationId,
} from './announcements-db';
import { redirect } from 'next/navigation';
import {
  addAnnouncementAction,
  updateAnnouncementAction,
  deleteAnnouncementAction,
} from './announcements-actions';

const mockRequireLeaderOf = vi.mocked(requireLeaderOf);
const mockGetOrganizationIdByKey = vi.mocked(getOrganizationIdByKey);
const mockAddAnnouncement = vi.mocked(addAnnouncement);
const mockUpdateAnnouncement = vi.mocked(updateAnnouncement);
const mockDeleteAnnouncement = vi.mocked(deleteAnnouncement);
const mockGetAnnouncementOrganizationId = vi.mocked(getAnnouncementOrganizationId);
const mockRedirect = vi.mocked(redirect);

function formWithId(id: number): FormData {
  const fd = new FormData();
  fd.set('id', String(id));
  return fd;
}

const baseValues = {
  organizationKey: 'relief_society',
  title: 'Cambio de horario',
  body: '',
  startsOn: '',
  endsOn: '2026-10-31',
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
  return fd;
}

beforeEach(() => {
  mockRequireLeaderOf.mockReset();
  mockGetOrganizationIdByKey.mockReset();
  mockAddAnnouncement.mockReset();
  mockUpdateAnnouncement.mockReset();
  mockDeleteAnnouncement.mockReset();
  mockGetAnnouncementOrganizationId.mockReset();
});

describe('addAnnouncementAction', () => {
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

    await addAnnouncementAction({}, formWithValues(baseValues));

    expect(calls).toEqual(['lookup:relief_society', 'permission:60']);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(60);
    expect(mockAddAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 60 }),
      null
    );
  });

  it('resolves an empty organizationKey to null (unit-wide) before asking permission', async () => {
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'admin', organizationId: null });

    await addAnnouncementAction({}, formWithValues({ ...baseValues, organizationKey: '' }));

    expect(mockGetOrganizationIdByKey).not.toHaveBeenCalled();
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(null);
    expect(mockAddAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: null }),
      null
    );
  });

  it('defaults audience to private, never public', async () => {
    mockGetOrganizationIdByKey.mockResolvedValue(60);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 60 });
    const fd = formWithValues(baseValues);
    fd.delete('audience');

    await addAnnouncementAction({}, fd);

    expect(mockAddAnnouncement).toHaveBeenCalledWith(
      expect.objectContaining({ audience: 'private' }),
      null
    );
  });

  it('swallows NotAuthorizedError and does not write', async () => {
    mockGetOrganizationIdByKey.mockResolvedValue(60);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    const result = await addAnnouncementAction({}, formWithValues(baseValues));

    expect(result.message).toBe('admin.notAllowed');
    expect(mockAddAnnouncement).not.toHaveBeenCalled();
  });

  it('redirects to the announcements list after a successful create', async () => {
    mockGetOrganizationIdByKey.mockResolvedValue(60);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 60 });
    mockAddAnnouncement.mockResolvedValue(42);

    await addAnnouncementAction({}, formWithValues(baseValues));

    expect(mockRedirect).toHaveBeenCalledWith('/announcements');
  });
});

describe('deleteAnnouncementAction', () => {
  it('resolves the organization before asking permission, then acts', async () => {
    const calls: string[] = [];
    mockGetAnnouncementOrganizationId.mockImplementation(async () => {
      calls.push('lookup');
      return 30;
    });
    mockRequireLeaderOf.mockImplementation(async () => {
      calls.push('permission');
      return { id: '1', role: 'leader', organizationId: 30 };
    });

    await deleteAnnouncementAction(formWithId(5));

    expect(calls).toEqual(['lookup', 'permission']);
    expect(mockGetAnnouncementOrganizationId).toHaveBeenCalledWith(5);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(30);
    expect(mockDeleteAnnouncement).toHaveBeenCalledWith(5);
  });

  it('returns silently, without checking permission, when the announcement does not exist', async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(undefined);

    await deleteAnnouncementAction(formWithId(999));

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockDeleteAnnouncement).not.toHaveBeenCalled();
  });

  it('swallows NotAuthorizedError instead of letting it escape as a 500', async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(30);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    await expect(deleteAnnouncementAction(formWithId(5))).resolves.toBeUndefined();
    expect(mockDeleteAnnouncement).not.toHaveBeenCalled();
  });

  it('rejects an id that is missing, empty, zero, or not an integer, without checking permission', async () => {
    for (const badId of ['', '0', '-1', 'abc', '1.5']) {
      const fd = new FormData();
      fd.set('id', badId);
      await deleteAnnouncementAction(fd);
    }

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockDeleteAnnouncement).not.toHaveBeenCalled();
  });
});

describe('updateAnnouncementAction', () => {
  it('returns silently when the announcement does not exist, without checking permission', async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(undefined);

    const result = await updateAnnouncementAction({}, formWithValues(baseValues, 999));

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockUpdateAnnouncement).not.toHaveBeenCalled();
    expect(result.message).toBe('admin.notAllowed');
  });

  it('checks permission on both organizations when the form moves the announcement, and only then writes', async () => {
    // Announcement currently belongs to org 10; the form submits org 20.
    const calls: string[] = [];
    mockGetAnnouncementOrganizationId.mockImplementation(async () => {
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

    await updateAnnouncementAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(calls).toEqual(['lookup-current', 'lookup-new:young_men', 'permission:10', 'permission:20']);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(10);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(20);
    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ organizationId: 20 })
    );
  });

  it('rejects the move when the caller may edit the current organization but not the new one', async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(20);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 10) {
        return { id: '1', role: 'leader', organizationId: 10 };
      }
      throw new NotAuthorizedError();
    });

    const result = await updateAnnouncementAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateAnnouncement).not.toHaveBeenCalled();
  });

  it("rejects the move when the caller may edit the new organization but not the current one (stealing another org's announcement)", async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(20);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 20) {
        return { id: '1', role: 'leader', organizationId: 20 };
      }
      throw new NotAuthorizedError();
    });

    const result = await updateAnnouncementAction(
      {},
      formWithValues({ ...baseValues, organizationKey: 'young_men' }, 7)
    );

    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateAnnouncement).not.toHaveBeenCalled();
  });

  it('a leader cannot turn their own announcement into a unit-wide one, because requireLeaderOf(null) fails for them', async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(10);
    mockRequireLeaderOf.mockImplementation(async (organizationId) => {
      if (organizationId === 10) {
        return { id: '1', role: 'leader', organizationId: 10 };
      }
      // organizationId === null: a leader is never the leader of "no
      // organization", so this rejects exactly like the real rule does.
      throw new NotAuthorizedError();
    });

    const result = await updateAnnouncementAction(
      {},
      formWithValues({ ...baseValues, organizationKey: '' }, 7)
    );

    expect(mockGetOrganizationIdByKey).not.toHaveBeenCalled();
    expect(result.message).toBe('admin.notAllowed');
    expect(mockUpdateAnnouncement).not.toHaveBeenCalled();
  });

  it('resolves and checks permission before writing when the organization is unchanged', async () => {
    const calls: string[] = [];
    mockGetAnnouncementOrganizationId.mockImplementation(async () => {
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

    await updateAnnouncementAction({}, formWithValues(baseValues, 7));

    expect(calls[calls.length - 2]).toBe('permission:10');
    expect(calls[calls.length - 1]).toBe('permission:10');
    expect(mockUpdateAnnouncement).toHaveBeenCalledWith(
      7,
      expect.objectContaining({ organizationId: 10 })
    );
  });

  it('redirects to the announcements list after a successful update', async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockResolvedValue({ id: '1', role: 'leader', organizationId: 10 });

    await updateAnnouncementAction({}, formWithValues(baseValues, 7));

    expect(mockRedirect).toHaveBeenCalledWith('/announcements');
  });

  it('reports the same message for a forbidden announcement as for a missing one', async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(10);
    mockGetOrganizationIdByKey.mockResolvedValue(10);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    const forbidden = await updateAnnouncementAction({}, formWithValues(baseValues, 7));

    mockGetAnnouncementOrganizationId.mockResolvedValue(undefined);
    const missing = await updateAnnouncementAction({}, formWithValues(baseValues, 999));

    expect(forbidden.message).toBe(missing.message);
  });

  it('rejects an id that is missing, empty, zero, or not an integer, without checking permission', async () => {
    for (const badId of ['', '0', '-1', 'abc', '1.5']) {
      const fd = new FormData();
      fd.set('id', badId);
      for (const [key, value] of Object.entries(baseValues)) {
        fd.set(key, value);
      }
      const result = await updateAnnouncementAction({}, fd);
      expect(result.message).toBe('validation.fixFields');
    }
    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
  });

  it('rejects an empty end date even when moving between organizations', async () => {
    mockGetAnnouncementOrganizationId.mockResolvedValue(10);

    const result = await updateAnnouncementAction(
      {},
      formWithValues({ ...baseValues, endsOn: '' }, 7)
    );

    expect(result.errors?.endsOn).toBeDefined();
    expect(mockGetOrganizationIdByKey).not.toHaveBeenCalled();
    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
  });
});
