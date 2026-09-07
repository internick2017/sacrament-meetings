import { cache } from 'react';
import { sql } from './db';
import type { EventPhoto, OrganizationKey } from './types';

// One row per photo.
interface EventPhotoRow {
  id: number;
  event_id: number;
  url: string;
  caption: string;
  approved: boolean;
}

function mapRow(row: EventPhotoRow): EventPhoto {
  return {
    id: row.id,
    eventId: row.event_id,
    url: row.url,
    caption: row.caption,
    approved: row.approved,
  };
}

const SELECT_ROWS = `
  SELECT p.id          AS id,
         p.event_id    AS event_id,
         p.url         AS url,
         p.caption     AS caption,
         p.approved    AS approved
    FROM event_photos p
`;

// Default is "approved only": the gallery a member sees uses this default. A
// caller opts into unapproved photos explicitly (includeUnapproved: true)
// rather than the filter being opt-in, so a forgetful call site fails safe
// (shows fewer photos) instead of failing open (leaking an unapproved photo
// of a child to the public gallery). The leader's own view of an activity
// they lead, and the admin approval queue, are the two callers that pass
// includeUnapproved: true.
export const getEventPhotos = cache(async function getEventPhotos(
  eventId: number,
  { includeUnapproved }: { includeUnapproved?: boolean } = {}
): Promise<EventPhoto[]> {
  const conditions = [`p.event_id = $1`];
  const params: unknown[] = [eventId];

  if (includeUnapproved !== true) {
    conditions.push(`p.approved = TRUE`);
  }

  const query = `${SELECT_ROWS} WHERE ${conditions.join(' AND ')} ORDER BY p.created_at ASC`;

  const rows = (await sql.query(query, params)) as EventPhotoRow[];

  return rows.map(mapRow);
});

// A row for the admin's pending-approval queue: the photo plus enough context
// about its activity (title, org_key) to decide without another lookup.
export interface PendingEventPhoto extends EventPhoto {
  eventTitle: string;
  organizationKey: OrganizationKey | null;
}

export const getPendingPhotos = cache(async function getPendingPhotos(): Promise<
  PendingEventPhoto[]
> {
  const rows = (await sql.query(`
    SELECT p.id              AS id,
           p.event_id        AS event_id,
           p.url             AS url,
           p.caption         AS caption,
           p.approved        AS approved,
           e.title           AS event_title,
           o.org_key         AS org_key
      FROM event_photos p
      JOIN events e ON e.id = p.event_id
      LEFT JOIN organizations o ON o.id = e.organization_id
     WHERE p.approved = FALSE
     ORDER BY p.created_at ASC
  `)) as (EventPhotoRow & { event_title: string; org_key: OrganizationKey | null })[];

  return rows.map((row) => ({
    ...mapRow(row),
    eventTitle: row.event_title,
    organizationKey: row.org_key,
  }));
});

export async function addEventPhoto(input: {
  eventId: number;
  url: string;
  caption: string;
  approved: boolean;
  uploadedBy: number | null;
}): Promise<number> {
  const rows = (await sql.query(
    `INSERT INTO event_photos
       (event_id, url, caption, approved, uploaded_by)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id`,
    [input.eventId, input.url, input.caption, input.approved, input.uploadedBy]
  )) as { id: number }[];
  return rows[0].id;
}

export async function approveEventPhoto(id: number, approvedBy: number | null): Promise<void> {
  await sql.query(
    `UPDATE event_photos
        SET approved = TRUE,
            approved_by = $1,
            approved_at = now()
      WHERE id = $2`,
    [approvedBy, id]
  );
}

export async function deleteEventPhoto(id: number): Promise<void> {
  await sql.query(`DELETE FROM event_photos WHERE id = $1`, [id]);
}

// Which activity a photo belongs to. `undefined` means no such photo, and
// callers must fail silently rather than treat a missing row as belonging to
// nothing in particular. Lets an action resolve the activity (and therefore
// the organization and the approval rule) BEFORE asking permission.
export async function getPhotoEventId(id: number): Promise<number | undefined> {
  const rows = (await sql.query(`SELECT event_id FROM event_photos WHERE id = $1`, [
    id,
  ])) as { event_id: number }[];
  if (rows.length === 0) {
    return undefined;
  }
  return rows[0].event_id;
}

// The stored file's URL for a photo, so it can be deleted from storage.
// `undefined` means no such photo.
export async function getPhotoUrl(id: number): Promise<string | undefined> {
  const rows = (await sql.query(`SELECT url FROM event_photos WHERE id = $1`, [
    id,
  ])) as { url: string }[];
  if (rows.length === 0) {
    return undefined;
  }
  return rows[0].url;
}
