import { cache } from 'react';
import { sql } from './db';
import type { Audience, EventInput, EventItem, OrganizationKey } from './types';

// One row per activity, already joined with its organization to bring the
// org_key needed to translate the organization name.
interface EventRow {
  id: number;
  organization_id: number | null;
  org_key: OrganizationKey | null;
  title: string;
  description: string;
  location: string;
  starts_at: string;
  ends_at: string | null;
  all_day: boolean;
  audience: Audience;
  cover_url: string | null;
}

function mapRow(row: EventRow): EventItem {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationKey: row.org_key,
    title: row.title,
    description: row.description,
    location: row.location,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    allDay: row.all_day,
    audience: row.audience,
    coverUrl: row.cover_url,
  };
}

// Whether the caller may see private activities. This returns a SQL fragment
// rather than a parameter because a WHERE clause cannot be parameterised into
// "no condition at all". It takes a boolean and returns one of two constant
// strings, so no caller-supplied value can ever reach the query — that
// property is what the test pins down, and it must not be relaxed into
// accepting a string.
export function audienceFilter(signedIn: boolean): string {
  return signedIn ? 'TRUE' : "audience = 'public'";
}

const SELECT_ROWS = `
  SELECT e.id              AS id,
         e.organization_id AS organization_id,
         o.org_key         AS org_key,
         e.title           AS title,
         e.description     AS description,
         e.location        AS location,
         e.starts_at       AS starts_at,
         e.ends_at         AS ends_at,
         e.all_day         AS all_day,
         e.audience        AS audience,
         e.cover_url       AS cover_url
    FROM events e
    LEFT JOIN organizations o
      ON o.id = e.organization_id
`;

export const getEvents = cache(async function getEvents({
  signedIn,
  organizationId,
  upcoming,
}: {
  signedIn: boolean;
  organizationId?: number;
  upcoming?: boolean;
}): Promise<EventItem[]> {
  const conditions = [audienceFilter(signedIn)];
  const params: unknown[] = [];

  if (organizationId !== undefined) {
    params.push(organizationId);
    conditions.push(`e.organization_id = $${params.length}`);
  }

  if (upcoming === true) {
    conditions.push('e.starts_at >= now()');
  } else if (upcoming === false) {
    conditions.push('e.starts_at < now()');
  }

  const orderBy = upcoming === true ? 'ASC' : 'DESC';

  const rows = (await sql.query(
    `${SELECT_ROWS} WHERE ${conditions.join(' AND ')} ORDER BY e.starts_at ${orderBy}`,
    params
  )) as EventRow[];

  return rows.map(mapRow);
});

export const getEventById = cache(async function getEventById(
  id: number,
  signedIn: boolean
): Promise<EventItem | undefined> {
  const rows = (await sql.query(
    `${SELECT_ROWS} WHERE e.id = $1 AND ${audienceFilter(signedIn)}`,
    [id]
  )) as EventRow[];
  return rows[0] ? mapRow(rows[0]) : undefined;
});

export async function addEvent(input: EventInput, createdBy: number | null): Promise<number> {
  const rows = (await sql.query(
    `INSERT INTO events
       (organization_id, title, description, location, starts_at, ends_at, all_day, audience, cover_url, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      input.organizationId,
      input.title,
      input.description,
      input.location,
      input.startsAt,
      input.endsAt,
      input.allDay,
      input.audience,
      input.coverUrl,
      createdBy,
    ]
  )) as { id: number }[];
  return rows[0].id;
}

export async function updateEvent(id: number, input: EventInput): Promise<void> {
  await sql.query(
    `UPDATE events
        SET organization_id = $1,
            title = $2,
            description = $3,
            location = $4,
            starts_at = $5,
            ends_at = $6,
            all_day = $7,
            audience = $8,
            cover_url = $9
      WHERE id = $10`,
    [
      input.organizationId,
      input.title,
      input.description,
      input.location,
      input.startsAt,
      input.endsAt,
      input.allDay,
      input.audience,
      input.coverUrl,
      id,
    ]
  );
}

export async function deleteEvent(id: number): Promise<void> {
  await sql.query(`DELETE FROM events WHERE id = $1`, [id]);
}

// The activity's current cover_url, used by updateEventAction to carry the
// existing cover forward when the leader submits an edit without choosing a
// new file and without ticking "remove cover". `undefined` means no such
// activity (the caller has already checked existence via
// getEventOrganizationId by the time this runs, but the type still allows
// it defensively).
export async function getEventCoverUrl(id: number): Promise<string | null | undefined> {
  const rows = (await sql.query(`SELECT cover_url FROM events WHERE id = $1`, [
    id,
  ])) as { cover_url: string | null }[];
  if (rows.length === 0) {
    return undefined;
  }
  return rows[0].cover_url;
}

// Which organization an activity belongs to. `null` means it exists and
// belongs to the whole branch (only an admin may edit it); `undefined` means
// no such activity, and callers must fail silently rather than treat a
// missing row as congregation-wide.
export async function getEventOrganizationId(
  id: number
): Promise<number | null | undefined> {
  const rows = (await sql.query(
    `SELECT organization_id FROM events WHERE id = $1`,
    [id]
  )) as { organization_id: number | null }[];
  if (rows.length === 0) {
    return undefined;
  }
  return rows[0].organization_id;
}
