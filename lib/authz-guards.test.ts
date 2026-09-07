import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Session } from 'next-auth';

// requireAdmin/requireLeaderOf are the functions every write path (Server
// Actions in the next task) will call. They sit on top of `auth()`, so the
// session is mocked here rather than pulled through next-auth/bcrypt/a real
// database connection.
vi.mock('./auth', () => ({
  auth: vi.fn(),
}));

import { auth } from './auth';
import { requireAdmin, requireLeaderOf, NotAuthorizedError } from './authz';

const mockAuth = vi.mocked(auth);

function sessionFor(role: string, organizationId: number | null): Session {
  return {
    user: { id: '1', role, organizationId },
    expires: '2099-01-01T00:00:00.000Z',
  } as unknown as Session;
}

describe('requireAdmin', () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it('passes for an admin', async () => {
    mockAuth.mockResolvedValue(sessionFor('admin', null));
    const user = await requireAdmin();
    expect(user.role).toBe('admin');
  });

  it('throws NotAuthorizedError for a leader', async () => {
    mockAuth.mockResolvedValue(sessionFor('leader', 30));
    await expect(requireAdmin()).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it('throws NotAuthorizedError for a member', async () => {
    mockAuth.mockResolvedValue(sessionFor('member', null));
    await expect(requireAdmin()).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it('throws NotAuthorizedError for an anonymous visitor', async () => {
    mockAuth.mockResolvedValue(null);
    await expect(requireAdmin()).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});

describe('requireLeaderOf', () => {
  beforeEach(() => {
    mockAuth.mockReset();
  });

  it('passes for an admin on any organization', async () => {
    mockAuth.mockResolvedValue(sessionFor('admin', null));
    const user = await requireLeaderOf(60);
    expect(user.role).toBe('admin');
  });

  it('passes for the matching leader', async () => {
    mockAuth.mockResolvedValue(sessionFor('leader', 30));
    const user = await requireLeaderOf(30);
    expect(user.role).toBe('leader');
  });

  it('throws for a non-matching leader', async () => {
    mockAuth.mockResolvedValue(sessionFor('leader', 30));
    await expect(requireLeaderOf(60)).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it('throws for a member', async () => {
    mockAuth.mockResolvedValue(sessionFor('member', null));
    await expect(requireLeaderOf(30)).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it('throws for a leader when the target is branch-wide (null)', async () => {
    mockAuth.mockResolvedValue(sessionFor('leader', 30));
    await expect(requireLeaderOf(null)).rejects.toBeInstanceOf(NotAuthorizedError);
  });

  it('accepts a numeric string organizationId, matching the leader', async () => {
    mockAuth.mockResolvedValue(sessionFor('leader', 30));
    const user = await requireLeaderOf('30');
    expect(user.role).toBe('leader');
  });

  it('throws for a non-numeric string organizationId', async () => {
    mockAuth.mockResolvedValue(sessionFor('admin', null));
    await expect(requireLeaderOf('abc')).rejects.toBeInstanceOf(NotAuthorizedError);
  });
});
