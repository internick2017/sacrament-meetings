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

export interface UserWithOrganization {
  id: number;
  email: string | null;
  role: Role;
  organizationId: number | null;
  organizationKey: string | null;
}

interface UserWithOrganizationRow {
  id: number;
  email: string | null;
  role: Role;
  organization_id: number | null;
  org_key: string | null;
}

// All accounts, for the admin panel. LEFT JOIN so a user with no organization
// (an admin, or a member) still appears, with organizationKey null.
export async function listUsers(): Promise<UserWithOrganization[]> {
  const rows = (await sql.query(
    `SELECT u.id, u.email, u.role, u.organization_id, o.org_key
       FROM users u
       LEFT JOIN organizations o ON o.id = u.organization_id
      ORDER BY u.email`
  )) as UserWithOrganizationRow[];

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    role: row.role,
    organizationId: row.organization_id,
    organizationKey: row.org_key,
  }));
}

export interface NewUser {
  email: string;
  role: Role;
  organizationId: number | null;
}

// username and password_hash are left null: this account signs in only via
// magic link, never with a password.
export async function addUser({ email, role, organizationId }: NewUser): Promise<void> {
  await sql.query(
    `INSERT INTO users (username, email, password_hash, role, organization_id)
     VALUES (NULL, $1, NULL, $2, $3)`,
    [email, role, organizationId]
  );
}

export async function updateUserRole(
  id: number,
  role: Role,
  organizationId: number | null
): Promise<void> {
  await sql.query(`UPDATE users SET role = $2, organization_id = $3 WHERE id = $1`, [
    id,
    role,
    organizationId,
  ]);
}

export async function deleteUser(id: number): Promise<void> {
  await sql.query(`DELETE FROM users WHERE id = $1`, [id]);
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
