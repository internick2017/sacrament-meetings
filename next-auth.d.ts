import type { DefaultSession } from 'next-auth';
import type { Role } from './lib/types';

// Augments next-auth's own types so `role` and `organizationId` are known on
// the session and JWT everywhere, without a cast at every read site. This is
// a compile-time convenience only: it does NOT validate anything at runtime.
// getSessionUser() in lib/authz.ts still re-validates the role against ROLES
// and falls back to 'member' — a type declaration cannot enforce that a value
// read off a JWT actually is one of the roles it claims to be.
declare module 'next-auth' {
  interface Session {
    user: {
      role?: Role;
      organizationId?: number | null;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role?: Role;
    organizationId?: number | null;
  }
}
