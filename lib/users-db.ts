import { sql } from './db';

export interface AuthUser {
  id: number;
  username: string;
  passwordHash: string;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string;
}

// Look up a single user by username for the Credentials provider's
// authorize() callback. Returns undefined if no user has that username.
export async function getUserByUsername(username: string): Promise<AuthUser | undefined> {
  const rows = (await sql.query(
    `SELECT id, username, password_hash FROM users WHERE username = $1`,
    [username]
  )) as UserRow[];

  const row = rows[0];
  return row
    ? { id: row.id, username: row.username, passwordHash: row.password_hash }
    : undefined;
}
