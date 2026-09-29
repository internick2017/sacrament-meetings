import NextAuth, { type NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import Resend from 'next-auth/providers/resend';
import Nodemailer from 'next-auth/providers/nodemailer';
import bcrypt from 'bcryptjs';
import { createTransport } from 'nodemailer';
import { buildMagicLinkEmail } from './magic-link-email';
import { getUnit } from './unit-db';
import { getUserByUsername, getUserByEmail, getAppUserById } from './users-db';
import { postgresAdapter } from './auth-adapter';

// Magic links go out through the ward's own Gmail account when it is
// configured: Resend only delivers to verified domains, and the ward has none,
// so with Resend alone a link can only ever reach the account owner. Resend
// stays as the fallback so the live site keeps working until Gmail is set up.
// With neither configured the option is not offered and password sign-in keeps
// working.
async function unitDisplayName(): Promise<string> {
  try {
    const unit = await getUnit();
    const name = unit.name.trim();
    if (!name) {
      return '';
    }
    return `${unit.unitType === 'ward' ? 'Ala' : 'Ramo'} ${name}`;
  } catch {
    // A failed lookup must not block someone from signing in: the e-mail falls
    // back to a neutral name.
    return '';
  }
}

function emailProvider() {
  const gmailUser = process.env.AUTH_GMAIL_USER;
  const gmailPassword = process.env.AUTH_GMAIL_APP_PASSWORD;
  if (gmailUser && gmailPassword) {
    return Nodemailer({
      server: {
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: { user: gmailUser, pass: gmailPassword },
      },
      from: process.env.AUTH_EMAIL_FROM ?? gmailUser,
      async sendVerificationRequest({ identifier, url, provider }) {
        const unitName = await unitDisplayName();
        const { subject, text, html } = buildMagicLinkEmail({ url, unitName });
        const result = await createTransport(provider.server).sendMail({
          to: identifier,
          // The ward's name as the sender's display name, so the inbox shows
          // who is writing instead of a bare Gmail address.
          from: process.env.AUTH_EMAIL_FROM ?? { name: unitName, address: gmailUser },
          subject,
          text,
          html,
        });
        const failed = [...(result.rejected ?? []), ...(result.pending ?? [])];
        if (failed.length) {
          throw new Error(`Magic-link e-mail could not be sent to ${failed.join(', ')}`);
        }
      },
    });
  }
  if (process.env.AUTH_RESEND_KEY) {
    return Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? 'onboarding@resend.dev',
    });
  }
  return null;
}

const magicLinkProvider = emailProvider();

// The provider id signIn() must be called with, or null when magic links are
// off. Server-side only: the login form receives just the boolean below.
export const magicLinkProviderId: string | null = magicLinkProvider?.id ?? null;

export const magicLinkEnabled = magicLinkProviderId !== null;

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

        // Member accounts (migration 004 onward) have no password hash and
        // sign in only via magic link. Reject the credentials attempt before
        // ever calling bcrypt.compare, which requires a string.
        if (!user.passwordHash) {
          return null;
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          return null;
        }

        return { id: String(user.id), name: user.username };
      },
    }),
    ...(magicLinkProvider ? [magicLinkProvider] : []),
  ],
  pages: {
    signIn: '/login',
  },
  // 12 hours rather than the default 30 days: deleting a user (or changing
  // their role) must take effect quickly, and the jwt callback below is what
  // actually enforces that on every re-issue within this window.
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 12,
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

    // Roles live on the JWT so most requests avoid a query, but the row is
    // re-read on every request (not just at sign-in): this is what makes
    // deleting a user, or changing their role, actually take effect instead
    // of waiting up to `session.maxAge` for the old JWT to expire. The cost
    // is one extra DB read per request that needs a session — accepted as
    // the price of removal actually meaning removal.
    async jwt({ token, user }) {
      if (user?.id) {
        // First issuance, right after sign-in: `user` is the freshly
        // authenticated account, trusted as-is.
        const appUser = await getAppUserById(Number(user.id));
        if (appUser) {
          token.role = appUser.role;
          token.organizationId = appUser.organizationId;
        }
        return token;
      }

      // Every subsequent request: re-read the row so a deleted user loses
      // their session promptly and a role change applies without requiring
      // a fresh sign-in.
      if (token.sub) {
        const appUser = await getAppUserById(Number(token.sub));
        if (!appUser) {
          // Returning null invalidates the session (see the `jwt` callback's
          // `Awaitable<JWT | null>` return type in @auth/core) — the row is
          // gone, so the token must stop being honored.
          return null;
        }
        token.role = appUser.role;
        token.organizationId = appUser.organizationId;
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
