import type { Adapter, AdapterUser, VerificationToken } from 'next-auth/adapters';
import { sql } from './db';
import { getUserByEmail, getAppUserById } from './users-db';

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
    const user = await getAppUserById(Number(id));
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
    const existing = await getAppUserById(Number(user.id));
    if (!existing) {
      throw new Error('User not found');
    }
    return toAdapterUser(existing);
  },

  async createVerificationToken(token) {
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
