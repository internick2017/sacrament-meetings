import { sql } from './db';
import type { Role } from './types';

export interface AppUser {
  id: number;
  username: string | null;
  email: string | null;
  role: Role;
  organizationId: number | null;
  personId: number | null;
}

interface AppUserRow {
  id: number;
  username: string | null;
  email: string | null;
  role: Role;
  organization_id: number | null;
  person_id: number | null;
}

function mapAppUser(row: AppUserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    organizationId: row.organization_id,
    personId: row.person_id,
  };
}

const APP_USER_COLUMNS = `id, username, email, role, organization_id, person_id`;

// Case-insensitive on purpose: the unique index is on lower(email), so this is
// the lookup that matches it. Anything else would let a capitalised address
// slip past the allow-list.
export async function getUserByEmail(email: string): Promise<AppUser | undefined> {
  const rows = (await sql.query(
    `SELECT ${APP_USER_COLUMNS} FROM users WHERE lower(email) = lower($1)`,
    [email]
  )) as AppUserRow[];
  return rows[0] ? mapAppUser(rows[0]) : undefined;
}

export async function getAppUserById(id: number): Promise<AppUser | undefined> {
  const rows = (await sql.query(
    `SELECT ${APP_USER_COLUMNS} FROM users WHERE id = $1`,
    [id]
  )) as AppUserRow[];
  return rows[0] ? mapAppUser(rows[0]) : undefined;
}

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
