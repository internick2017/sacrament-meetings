import { sql } from './db';

export interface PersonProfile {
  id: number;
  fullName: string;
  photoUrl: string | null;
}

interface PersonProfileRow {
  id: number;
  full_name: string;
  photo_url: string | null;
}

// Looked up by the profile page, always with the id from the session's own
// user.personId — never from a route param or form field. See
// lib/profile-actions.ts for the write side of this same rule.
export async function getPersonById(id: number): Promise<PersonProfile | undefined> {
  const rows = (await sql.query(
    `SELECT id, full_name, photo_url FROM people WHERE id = $1`,
    [id]
  )) as PersonProfileRow[];
  const row = rows[0];
  return row ? { id: row.id, fullName: row.full_name, photoUrl: row.photo_url } : undefined;
}

// Sets a person's own profile photo and records consent in the same write.
// `id` must always be the caller's own person_id, resolved server-side from
// the session — see lib/profile-actions.ts for the guarantee.
export async function setPersonPhoto(id: number, url: string): Promise<void> {
  await sql.query(`UPDATE people SET photo_url = $2, photo_consent_at = now() WHERE id = $1`, [
    id,
    url,
  ]);
}

// Clears a person's photo and consent record together: removing the photo
// also removes the record that they once consented to it.
export async function clearPersonPhoto(id: number): Promise<void> {
  await sql.query(
    `UPDATE people SET photo_url = NULL, photo_consent_at = NULL WHERE id = $1`,
    [id]
  );
}

// Reuse an existing person with the same name instead of creating a duplicate.
// Names are compared case-insensitively and trimmed, because "Ana Silva" typed
// twice should be one person with two callings, not two people.
export async function findOrCreatePerson(fullName: string): Promise<number> {
  const name = fullName.trim();

  const existing = (await sql.query(
    `SELECT id FROM people WHERE lower(full_name) = lower($1) LIMIT 1`,
    [name]
  )) as { id: number }[];
  if (existing[0]) {
    return existing[0].id;
  }

  const created = (await sql.query(
    `INSERT INTO people (full_name) VALUES ($1) RETURNING id`,
    [name]
  )) as { id: number }[];
  return created[0].id;
}

export interface CallingInput {
  organizationId: number;
  personName: string;
  title: string;
  displayOrder: number;
}

export async function addCalling(input: CallingInput): Promise<void> {
  const personId = await findOrCreatePerson(input.personName);
  await sql.query(
    `INSERT INTO callings (organization_id, person_id, title, display_order, started_on)
     VALUES ($1, $2, $3, $4, CURRENT_DATE)`,
    [input.organizationId, personId, input.title.trim(), input.displayOrder]
  );
}

// Releasing someone is not a delete: the row stays with an end date, so the
// branch keeps its history of who served when.
export async function endCalling(id: number): Promise<boolean> {
  const rows = (await sql.query(
    `UPDATE callings SET ended_on = CURRENT_DATE
      WHERE id = $1 AND ended_on IS NULL
      RETURNING id`,
    [id]
  )) as { id: number }[];
  return rows.length > 0;
}

// A real delete, for correcting a mistyped entry. Releasing is the normal path.
export async function deleteCalling(id: number): Promise<boolean> {
  const rows = (await sql.query(
    `DELETE FROM callings WHERE id = $1 RETURNING id`,
    [id]
  )) as { id: number }[];
  return rows.length > 0;
}
