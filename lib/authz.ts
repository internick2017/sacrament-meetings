import { cache } from 'react';
import { auth } from './auth';
import { ROLES } from './types';
import type { SessionUser } from './types';
import { canEditOrganization, NotAuthorizedError } from './authz-rules';

// Re-exported so every existing and future caller of this module keeps
// working unchanged; the pure rule itself now lives in ./authz-rules so it
// can be tested with zero infrastructure (no next-auth, no database).
export { canEditOrganization, NotAuthorizedError };

// Parse a value that should identify an organization. Accepts a number, or a
// numeric string (as round-trips through a JWT), and rejects anything else
// (including non-integer or non-finite numbers) by falling back to null.
function parseOrganizationId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isInteger(value) ? value : null;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isInteger(parsed) ? parsed : null;
  }
  return null;
}

// Read the current user off the session. Returns null for an anonymous
// visitor. Everything else in this file is built on top of this. Wrapped in
// React's cache() the same way getOrganizations/getUnit are, so the layout,
// the page, and any Server Action that all call this during one render
// collapse to a single `SELECT ... FROM users WHERE id = $1` instead of
// running it 3-4 times.
export const getSessionUser = cache(async function getSessionUser(): Promise<SessionUser | null> {
  const session = await auth();
  const user = session?.user;
  if (!user?.id) {
    return null;
  }

  const role = user.role;
  const organizationId = user.organizationId;

  return {
    id: user.id,
    // A session with no role, or a role outside the known set, is treated as
    // the least privileged thing there is, never as an admin. Failing closed
    // is the whole point.
    role: role && (ROLES as readonly string[]).includes(role) ? role : 'member',
    organizationId: parseOrganizationId(organizationId),
  };
});

export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== 'admin') {
    throw new NotAuthorizedError();
  }
  return user;
}

// Passes for an admin, or for the leader of exactly this organization.
// `organizationId` may arrive as a number, a numeric string (route params and
// form fields are always strings), or null; anything else is rejected.
export async function requireLeaderOf(
  organizationId: number | string | null
): Promise<SessionUser> {
  const user = await getSessionUser();

  let normalized: number | null;
  if (organizationId === null) {
    normalized = null;
  } else if (typeof organizationId === 'number' && Number.isInteger(organizationId)) {
    normalized = organizationId;
  } else if (typeof organizationId === 'string' && organizationId.trim() !== '') {
    const parsed = Number(organizationId);
    if (!Number.isInteger(parsed)) {
      throw new NotAuthorizedError();
    }
    normalized = parsed;
  } else {
    throw new NotAuthorizedError();
  }

  if (!user || !canEditOrganization(user, normalized)) {
    throw new NotAuthorizedError();
  }
  return user;
}
