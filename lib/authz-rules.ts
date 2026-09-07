import type { SessionUser } from './types';

// Thrown when a signed-in user tries something their role does not allow. It is
// a distinct class so a Server Action can catch it and show a message, instead
// of it surfacing as an unexplained 500.
export class NotAuthorizedError extends Error {
  constructor(message = 'Not authorized') {
    super(message);
    this.name = 'NotAuthorizedError';
  }
}

// The single rule of the whole permission system, written once, as a pure
// function so it can be tested exhaustively without a database or a request.
//
// `organizationId` is the organization the content being edited belongs to.
// null means branch-wide content (a unit setting, a meeting, an activity for
// the whole branch), which only an admin may touch.
export function canEditOrganization(
  user: SessionUser | null,
  organizationId: number | null
): boolean {
  if (!user) {
    return false;
  }

  if (user.role === 'admin') {
    return true;
  }

  if (user.role !== 'leader') {
    return false;
  }

  // A leader may only edit their own organization, and never branch-wide
  // content. The comparison is strict: an organizationId that arrived as a
  // string from a JWT must not pass by coercion.
  return (
    typeof user.organizationId === 'number' &&
    typeof organizationId === 'number' &&
    user.organizationId === organizationId
  );
}
