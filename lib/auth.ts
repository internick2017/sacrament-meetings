import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import bcrypt from 'bcryptjs';
import { getUserByUsername, getUserByEmail, getAppUserById } from './users-db';
import { postgresAdapter } from './auth-adapter';

// The Resend provider is only registered when its key is present. Nick has not
// created the Resend account yet, and a site that refuses to start because an
// optional key is missing would be a step backwards: password sign-in has to
// keep working either way.
const resendProviders = process.env.AUTH_RESEND_KEY
  ? [
      Resend({
        apiKey: process.env.AUTH_RESEND_KEY,
        from: process.env.AUTH_EMAIL_FROM ?? 'onboarding@resend.dev',
      }),
    ]
  : [];

// Whether magic-link sign-in is actually available, for the login form to
// decide whether to show that option. Server-side only: never expose the key
// itself, only this boolean, to the client.
export const magicLinkEnabled = Boolean(process.env.AUTH_RESEND_KEY);

// Exported (rather than kept inline in the NextAuth() call) so the jwt/session
// callbacks can be exercised directly by tests, without going through next-auth
// internals or a real database. See auth.test.ts: it proves that a user whose
// database row says 'admin' ends up with session.user.role === 'admin' — the
// one thing this file must never get wrong silently.
export const authConfig: NextAuthConfig = {
  adapter: postgresAdapter,
  providers: [
    Credentials({
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        const username = credentials?.username;
        const password = credentials?.password;
        if (typeof username !== 'string' || typeof password !== 'string') {
          return null;
        }

        const user = await getUserByUsername(username);
        if (!user) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return { id: String(user.id), name: user.username };
      },
    }),
    ...resendProviders,
  ],
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    // THE ALLOW-LIST. The users table is the list: an e-mail with no row gets
    // no link. This must be checked both when the link is SENT (email.verificationRequest
    // is set, account.type === 'email') and when it is REDEEMED (no `email` argument,
    // but account.type is still 'email') — @auth/core only sets `email` on the send
    // path, so gating on that flag alone lets a since-removed user's still-valid
    // (up to 24h) link keep working. Checking account.type covers both paths with
    // one condition. The credentials path authenticates by its own means and is
    // not subject to this allow-list.
    async signIn({ user, account }) {
      if (account?.type === 'email') {
        return user.email ? !!(await getUserByEmail(user.email)) : false;
      }
      return true;
    },

    // Roles live on the JWT so every request has them without a query. They are
    // read from the database at sign-in time, never from anything the client
    // sent. NOTE: because of this, a role change in the database does not take
    // effect until the person signs in again.
    async jwt({ token, user }) {
      if (user?.id) {
        const appUser = await getAppUserById(Number(user.id));
        if (appUser) {
          token.role = appUser.role;
          token.organizationId = appUser.organizationId;
        }
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = String(token.sub ?? session.user.id);
        session.user.role = token.role;
        session.user.organizationId = token.organizationId ?? null;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
