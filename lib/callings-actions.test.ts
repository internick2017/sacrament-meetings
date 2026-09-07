import { describe, it, expect, vi, beforeEach } from 'vitest';

// These two Server Actions used to accept a bare id and only check that a
// session existed. Fixed here: they must resolve which organization the
// calling belongs to BEFORE asking permission, so a leader cannot act on
// another organization's calling by guessing its id. Everything is mocked at
// the boundary (authz, the db reads/writes, next/cache) so the test proves
// the ordering and error handling without a real database or session.
// NotAuthorizedError itself is the real class from lib/authz-rules.ts (the
// module lib/authz.ts re-exports it from), not a local stand-in: this proves
// the class the action's catch block matches is the same class the real
// module throws, not merely something shaped like it.
vi.mock('./authz', async () => {
  const { NotAuthorizedError } = await import('./authz-rules');
  return {
    requireLeaderOf: vi.fn(),
    NotAuthorizedError,
  };
});
vi.mock('./organizations-db', () => ({
  getCallingOrganizationId: vi.fn(),
  getOrganizationIdByKey: vi.fn(),
}));
vi.mock('./people-db', () => ({
  addCalling: vi.fn(),
  endCalling: vi.fn(),
  deleteCalling: vi.fn(),
}));
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));
vi.mock('./i18n/server', () => ({
  getT: vi.fn().mockResolvedValue((key: string) => key),
}));

import { requireLeaderOf, NotAuthorizedError } from './authz';
import { getCallingOrganizationId, getOrganizationIdByKey } from './organizations-db';
import { addCalling, endCalling, deleteCalling } from './people-db';
import { addCallingAction, endCallingAction, deleteCallingAction } from './callings-actions';

const mockRequireLeaderOf = vi.mocked(requireLeaderOf);
const mockGetCallingOrganizationId = vi.mocked(getCallingOrganizationId);
const mockGetOrganizationIdByKey = vi.mocked(getOrganizationIdByKey);
const mockAddCalling = vi.mocked(addCalling);
const mockEndCalling = vi.mocked(endCalling);
const mockDeleteCalling = vi.mocked(deleteCalling);

function formWithId(id: number): FormData {
  const fd = new FormData();
  fd.set('id', String(id));
  return fd;
}

describe('endCallingAction', () => {
  beforeEach(() => {
    mockRequireLeaderOf.mockReset();
    mockGetCallingOrganizationId.mockReset();
    mockEndCalling.mockReset();
  });

  it('resolves the organization before asking permission, then acts', async () => {
    const calls: string[] = [];
    mockGetCallingOrganizationId.mockImplementation(async () => {
      calls.push('lookup');
      return 30;
    });
    mockRequireLeaderOf.mockImplementation(async () => {
      calls.push('permission');
      return { id: '1', role: 'leader', organizationId: 30 };
    });

    await endCallingAction(formWithId(5));

    expect(calls).toEqual(['lookup', 'permission']);
    expect(mockGetCallingOrganizationId).toHaveBeenCalledWith(5);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(30);
    expect(mockEndCalling).toHaveBeenCalledWith(5);
  });

  it('returns silently, without checking permission, when the calling does not exist', async () => {
    mockGetCallingOrganizationId.mockResolvedValue(undefined);

    await endCallingAction(formWithId(999));

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockEndCalling).not.toHaveBeenCalled();
  });

  it('swallows NotAuthorizedError instead of letting it escape as a 500', async () => {
    mockGetCallingOrganizationId.mockResolvedValue(30);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    await expect(endCallingAction(formWithId(5))).resolves.toBeUndefined();
    expect(mockEndCalling).not.toHaveBeenCalled();
  });
});

describe('deleteCallingAction', () => {
  beforeEach(() => {
    mockRequireLeaderOf.mockReset();
    mockGetCallingOrganizationId.mockReset();
    mockDeleteCalling.mockReset();
  });

  it('resolves the organization before asking permission, then acts', async () => {
    const calls: string[] = [];
    mockGetCallingOrganizationId.mockImplementation(async () => {
      calls.push('lookup');
      return 60;
    });
    mockRequireLeaderOf.mockImplementation(async () => {
      calls.push('permission');
      return { id: '1', role: 'admin', organizationId: null };
    });

    await deleteCallingAction(formWithId(9));

    expect(calls).toEqual(['lookup', 'permission']);
    expect(mockGetCallingOrganizationId).toHaveBeenCalledWith(9);
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(60);
    expect(mockDeleteCalling).toHaveBeenCalledWith(9);
  });

  it('returns silently when the calling does not exist', async () => {
    mockGetCallingOrganizationId.mockResolvedValue(undefined);

    await deleteCallingAction(formWithId(999));

    expect(mockRequireLeaderOf).not.toHaveBeenCalled();
    expect(mockDeleteCalling).not.toHaveBeenCalled();
  });

  it('swallows NotAuthorizedError instead of letting it escape as a 500', async () => {
    mockGetCallingOrganizationId.mockResolvedValue(60);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    await expect(deleteCallingAction(formWithId(9))).resolves.toBeUndefined();
    expect(mockDeleteCalling).not.toHaveBeenCalled();
  });
});

describe('addCallingAction', () => {
  beforeEach(() => {
    mockRequireLeaderOf.mockReset();
    mockGetOrganizationIdByKey.mockReset();
    mockAddCalling.mockReset();
  });

  function formWithValues(values: {
    organizationKey: string;
    personName: string;
    title: string;
    displayOrder: string;
  }): FormData {
    const fd = new FormData();
    fd.set('organizationKey', values.organizationKey);
    fd.set('personName', values.personName);
    fd.set('title', values.title);
    fd.set('displayOrder', values.displayOrder);
    return fd;
  }

  // organizationId is the one piece of the write derived from client-submitted
  // data (the submitted key). This asserts requireLeaderOf is called with the
  // RESOLVED numeric id, not the raw submitted key: the key is 'primary', the
  // resolved id is 60 (deliberately unrelated in form), so the test would
  // fail if the code passed the raw client value through instead of the
  // looked-up id.
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

    await addCallingAction(
      { message: undefined },
      formWithValues({
        organizationKey: 'primary',
        personName: 'Jane Doe',
        title: 'President',
        displayOrder: '0',
      })
    );

    expect(calls).toEqual(['lookup:primary', 'permission:60']);
    expect(mockGetOrganizationIdByKey).toHaveBeenCalledWith('primary');
    expect(mockRequireLeaderOf).toHaveBeenCalledWith(60);
    expect(mockRequireLeaderOf).not.toHaveBeenCalledWith('primary');
    expect(mockAddCalling).toHaveBeenCalledWith(
      expect.objectContaining({ organizationId: 60 })
    );
  });

  it('swallows NotAuthorizedError and does not write', async () => {
    mockGetOrganizationIdByKey.mockResolvedValue(60);
    mockRequireLeaderOf.mockRejectedValue(new NotAuthorizedError());

    const result = await addCallingAction(
      { message: undefined },
      formWithValues({
        organizationKey: 'primary',
        personName: 'Jane Doe',
        title: 'President',
        displayOrder: '0',
      })
    );

    expect(result.message).toBe('admin.notAllowed');
    expect(mockAddCalling).not.toHaveBeenCalled();
  });
});
