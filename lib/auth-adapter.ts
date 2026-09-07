import type { Adapter, AdapterUser, VerificationToken } from 'next-auth/adapters';
import { sql } from './db';
import { getUserByEmail, getAppUserById } from './users-db';

// Minimum time an identifier must wait before another verification token is
// created for it. See createVerificationToken below.
const THROTTLE_SECONDS = 60;

// A deliberately small adapter. With the JWT session strategy NextAuth never
// calls the session methods, so the only things that must really work are the
// verification-token pair (which the magic link depends on) and looking a user
// up by e-mail.
//
// createUser THROWS on purpose: this site has no self-registration. A person
// signs in only if an admin already put their e-mail in the users table, and
// the signIn callback rejects everyone else before it ever gets here.

function toAdapterUser(user: { id: number; email: string | null }): AdapterUser {
  return {
    id: String(user.id),
    email: user.email ?? '',
    emailVerified: null,
  };
}

export const postgresAdapter: Adapter = {
  async createUser() {
    throw new Error('Self-registration is disabled: an admin must add the e-mail first');
  },

  async getUser(id) {
    const numericId = Number(id);
    if (!Number.isInteger(numericId)) {
      return null;
    }
    const user = await getAppUserById(numericId);
    return user ? toAdapterUser(user) : null;
  },

  async getUserByEmail(email) {
    const user = await getUserByEmail(email);
    return user ? toAdapterUser(user) : null;
  },

  // Accounts from external providers are not used here, so there is nothing to
  // look up and nothing to link.
  async getUserByAccount() {
    return null;
  },

  async linkAccount() {
    return undefined;
  },

  async updateUser(user) {
    const numericId = Number(user.id);
    if (!Number.isInteger(numericId)) {
      throw new Error('User not found');
    }
    const existing = await getAppUserById(numericId);
    if (!existing) {
      throw new Error('User not found');
    }
    return toAdapterUser(existing);
  },

  // Throttle window: refuse a new token for an identifier that already has
  // an unexpired one created within this many seconds. Keeps
  // requestMagicLinkAction from being an uncapped public write (one row +
  // one email per accepted call) without changing its response message —
  // the caller must see the same neutral text whether throttled, unknown,
  // or accepted, or the response itself would leak allow-list membership.
  async createVerificationToken(token) {
    // Sweep expired rows first so the table doesn't grow unbounded; nothing
    // else in this codebase deletes them.
    await sql.query(`DELETE FROM verification_token WHERE expires < now()`);

    const recent = (await sql.query(
      `SELECT 1 FROM verification_token
        WHERE identifier = $1 AND expires > now() AND created_at > now() - interval '${THROTTLE_SECONDS} seconds'
        LIMIT 1`,
      [token.identifier]
    )) as unknown[];

    if (recent.length > 0) {
      // Silently refuse: the caller (requestMagicLinkAction) shows the same
      // message either way, so no email row is created here and no signal
      // escapes about whether this identifier is throttled vs. unknown.
      return token;
    }

    await sql.query(
      `INSERT INTO verification_token (identifier, token, expires) VALUES ($1, $2, $3)`,
      [token.identifier, token.token, token.expires.toISOString()]
    );
    return token;
  },

  // Single use: the row is deleted as it is read, so a magic link cannot be
  // replayed. RETURNING gives us the row and removes it in one statement, so
  // there is no window where two requests could both consume the same token.
  async useVerificationToken({ identifier, token }): Promise<VerificationToken | null> {
    const rows = (await sql.query(
      `DELETE FROM verification_token
        WHERE identifier = $1 AND token = $2
        RETURNING identifier, token, expires`,
      [identifier, token]
    )) as { identifier: string; token: string; expires: string }[];

    const row = rows[0];
    if (!row) {
      return null;
    }
    return {
      identifier: row.identifier,
      token: row.token,
      expires: new Date(row.expires),
    };
  },
};
