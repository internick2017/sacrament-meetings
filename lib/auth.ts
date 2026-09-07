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
    // no link. Returning false here stops the mail before it is sent.
    async signIn({ user, email }) {
      if (email?.verificationRequest) {
        const known = user.email ? await getUserByEmail(user.email) : undefined;
        return !!known;
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
        (session.user as { role?: string }).role = token.role as string | undefined;
        (session.user as { organizationId?: number | null }).organizationId =
          (token.organizationId as number | null) ?? null;
      }
      return session;
    },
  },
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
