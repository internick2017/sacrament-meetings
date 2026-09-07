import { describe, it, expect, vi, beforeEach } from 'vitest';

// These two Server Actions used to accept a bare id and only check that a
// session existed. Fixed here: they must resolve which organization the
// calling belongs to BEFORE asking permission, so a leader cannot act on
// another organization's calling by guessing its id. Everything is mocked at
// the boundary (authz, the db reads/writes, next/cache) so the test proves
// the ordering and error handling without a real database or session.
vi.mock('./authz', () => ({
  requireLeaderOf: vi.fn(),
  NotAuthorizedError: class NotAuthorizedError extends Error {},
}));
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
import { getCallingOrganizationId } from './organizations-db';
import { endCalling, deleteCalling } from './people-db';
import { endCallingAction, deleteCallingAction } from './callings-actions';

const mockRequireLeaderOf = vi.mocked(requireLeaderOf);
const mockGetCallingOrganizationId = vi.mocked(getCallingOrganizationId);
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
