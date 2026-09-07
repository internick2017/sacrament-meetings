import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { JWT } from 'next-auth/jwt';
import type { Session } from 'next-auth';

// The single most important thing this task must prove: getSessionUser()
// normalises silently and fails closed (see lib/authz.ts), so if the jwt
// callback forgets to put the role on the token, or the session callback
// forgets to copy it onto session.user, every admin is quietly demoted to
// 'member' with nothing in the logs. These tests exercise the real callbacks
// from lib/auth.ts directly, with the database mocked, to prove that a user
// whose row says 'admin' actually reads back as 'admin'.
vi.mock('./users-db', () => ({
  getUserByUsername: vi.fn(),
  getUserByEmail: vi.fn(),
  getAppUserById: vi.fn(),
}));

// The adapter imports ./db (a real Postgres connection); it is never invoked
// by these tests (createUser/etc. are not exercised), but importing lib/auth
// pulls it in transitively, so it is mocked to keep the test hermetic.
vi.mock('./db', () => ({
  sql: { query: vi.fn() },
}));

// next-auth's own entry point pulls in next/server at import time, which
// vitest cannot resolve outside a Next.js runtime (see the removed
// vitest.config.mts workaround this project deliberately does not bring
// back). authConfig itself is plain data plus callback functions, so the
// only thing that needs mocking at this boundary is the NextAuth() factory
// call at the bottom of lib/auth.ts, never touched by these tests.
vi.mock('next-auth', () => ({
  default: () => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() }),
}));

import { getAppUserById } from './users-db';
import { authConfig } from './auth';

const mockGetAppUserById = vi.mocked(getAppUserById);

describe('auth callbacks: role propagation to the session', () => {
  beforeEach(() => {
    mockGetAppUserById.mockReset();
  });

  it('jwt callback copies an admin role and organizationId from the database onto the token', async () => {
    mockGetAppUserById.mockResolvedValue({
      id: 1,
      username: 'bishop',
      email: null,
      role: 'admin',
      organizationId: null,
      personId: null,
    });

    const token = (await authConfig.callbacks!.jwt!({
      token: {} as JWT,
      user: { id: '1' },
    } as never)) as JWT;

    expect(token.role).toBe('admin');
    expect(token.organizationId).toBeNull();
  });

  it('jwt callback copies a leader role and their organizationId', async () => {
    mockGetAppUserById.mockResolvedValue({
      id: 2,
      username: null,
      email: 'leader@example.org',
      role: 'leader',
      organizationId: 30,
      personId: null,
    });

    const token = (await authConfig.callbacks!.jwt!({
      token: {} as JWT,
      user: { id: '2' },
    } as never)) as JWT;

    expect(token.role).toBe('leader');
    expect(token.organizationId).toBe(30);
  });

  it('session callback copies role and organizationId from the token onto session.user, end to end for an admin', async () => {
    mockGetAppUserById.mockResolvedValue({
      id: 1,
      username: 'bishop',
      email: null,
      role: 'admin',
      organizationId: null,
      personId: null,
    });

    const token = (await authConfig.callbacks!.jwt!({
      token: {} as JWT,
      user: { id: '1' },
    } as never)) as JWT;

    const session = (await authConfig.callbacks!.session!({
      session: { user: { id: '1' }, expires: '2099-01-01T00:00:00.000Z' } as Session,
      token,
    } as never)) as Session;

    // This is the assertion that matters: an admin's database row must
    // survive the jwt -> session round trip as session.user.role === 'admin'.
    // If either callback drops or misspells the field, getSessionUser() in
    // lib/authz.ts falls back to 'member' with no error anywhere.
    expect((session.user as unknown as { role: string }).role).toBe('admin');
    expect((session.user as unknown as { organizationId: number | null }).organizationId).toBe(
      null
    );
  });

  it('session callback carries a leader organizationId through unchanged', async () => {
    const token = { role: 'leader', organizationId: 30, sub: '2' } as JWT;

    const session = (await authConfig.callbacks!.session!({
      session: { user: { id: '2' }, expires: '2099-01-01T00:00:00.000Z' } as Session,
      token,
    } as never)) as Session;

    expect((session.user as unknown as { role: string }).role).toBe('leader');
    expect((session.user as unknown as { organizationId: number | null }).organizationId).toBe(
      30
    );
  });

  it('jwt callback leaves the token unchanged when the user id has no matching database row', async () => {
    mockGetAppUserById.mockResolvedValue(undefined);

    const token = (await authConfig.callbacks!.jwt!({
      token: {} as JWT,
      user: { id: '999' },
    } as never)) as JWT;

    expect(token.role).toBeUndefined();
  });
});
