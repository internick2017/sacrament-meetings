import { sql } from './db';
import type { Role } from './types';

export interface AppUser {
  id: number;
  username: string | null;
  email: string | null;
  role: Role;
  organizationId: number | null;
  personId: number | null;
  photoUploadAllowed: boolean;
}

interface AppUserRow {
  id: number;
  username: string | null;
  email: string | null;
  role: Role;
  organization_id: number | null;
  person_id: number | null;
  photo_upload_allowed: boolean;
}

function mapAppUser(row: AppUserRow): AppUser {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    role: row.role,
    organizationId: row.organization_id,
    personId: row.person_id,
    photoUploadAllowed: row.photo_upload_allowed,
  };
}

const APP_USER_COLUMNS = `id, username, email, role, organization_id, person_id, photo_upload_allowed`;

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
  photoUploadAllowed: boolean;
}

interface UserWithOrganizationRow {
  id: number;
  email: string | null;
  role: Role;
  organization_id: number | null;
  org_key: string | null;
  photo_upload_allowed: boolean;
}

// All accounts, for the admin panel. LEFT JOIN so a user with no organization
// (an admin, or a member) still appears, with organizationKey null.
export async function listUsers(): Promise<UserWithOrganization[]> {
  const rows = (await sql.query(
    `SELECT u.id, u.email, u.role, u.organization_id, o.org_key, u.photo_upload_allowed
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
    photoUploadAllowed: row.photo_upload_allowed,
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

// Admin-only switch (enforced by the caller, requireAdmin(), not here).
// false is the default for every account; an admin turns it on one account
// at a time, and the panel that offers this control must carry the minor
// warning — see users.photoWarning in the dictionaries.
export async function updateUserPhotoUploadAllowed(id: number, allowed: boolean): Promise<void> {
  await sql.query(`UPDATE users SET photo_upload_allowed = $2 WHERE id = $1`, [id, allowed]);
}

export async function deleteUser(id: number): Promise<void> {
  await sql.query(`DELETE FROM users WHERE id = $1`, [id]);
}

export interface AuthUser {
  id: number;
  username: string;
  // Nullable since migration 004: member accounts sign in only via magic
  // link and never get a password row.
  passwordHash: string | null;
}

interface UserRow {
  id: number;
  username: string;
  password_hash: string | null;
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

// Minimum time an identifier must wait before requestMagicLinkAction is
// allowed to start another sign-in flow for it. Kept here (rather than in
// auth-adapter.ts's createVerificationToken) because @auth/core races
// sendVerificationRequest and createVerificationToken in a Promise.all, so a
// throttle inside the adapter cannot stop the e-mail itself — only refusing
// the call to signIn() before it starts can. See auth-actions.ts.
const MAGIC_LINK_THROTTLE_SECONDS = 60;

// True when a verification_token row for this address (case-insensitive,
// matching the `identifier` @auth/core stores, which is the raw e-mail) was
// created within the throttle window and has not yet expired. Comparison is
// done with lower() to match the lower(email) unique index used elsewhere in
// this project, since the identifier is not normalized before @auth/core
// hands it to the adapter.
export async function hasRecentVerificationToken(email: string): Promise<boolean> {
  const rows = (await sql.query(
    `SELECT 1 FROM verification_token
      WHERE lower(identifier) = lower($1)
        AND expires > now()
        AND created_at > now() - make_interval(secs => $2)
      LIMIT 1`,
    [email, MAGIC_LINK_THROTTLE_SECONDS]
  )) as unknown[];
  return rows.length > 0;
}
