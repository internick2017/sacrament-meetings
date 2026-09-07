import { cache } from 'react';
import { sql } from './db';
import { audienceFilter } from './events-db';
import type { Announcement, AnnouncementInput, Audience, OrganizationKey } from './types';

// One row per announcement, already joined with its organization to bring the
// org_key needed to translate the organization name.
interface AnnouncementRow {
  id: number;
  organization_id: number | null;
  org_key: OrganizationKey | null;
  title: string;
  body: string;
  starts_on: string | null;
  ends_on: string;
  audience: Audience;
}

function mapRow(row: AnnouncementRow): Announcement {
  return {
    id: row.id,
    organizationId: row.organization_id,
    organizationKey: row.org_key,
    title: row.title,
    body: row.body,
    startsOn: row.starts_on,
    endsOn: row.ends_on,
    audience: row.audience,
  };
}

// An announcement is in force when today falls inside its window. A null
// starts_on means "from today", so it is treated as always started.
//
// Like audienceFilter, this is concatenated into the query rather than
// parameterised, and it is safe for the same reason: it takes no arguments and
// returns a constant string, so nothing a caller supplies can reach the SQL.
export function currentFilter(): string {
  return '(starts_on IS NULL OR starts_on <= CURRENT_DATE) AND ends_on >= CURRENT_DATE';
}

// Dates are read as plain text via to_char so they never arrive as
// timezone-sensitive Date objects: a validity window is a calendar day, not
// an instant.
const SELECT_ROWS = `
  SELECT a.id                                  AS id,
         a.organization_id                     AS organization_id,
         o.org_key                             AS org_key,
         a.title                               AS title,
         a.body                                AS body,
         to_char(a.starts_on, 'YYYY-MM-DD')    AS starts_on,
         to_char(a.ends_on, 'YYYY-MM-DD')       AS ends_on,
         a.audience                            AS audience
    FROM announcements a
    LEFT JOIN organizations o
      ON o.id = a.organization_id
`;

export const getAnnouncements = cache(async function getAnnouncements({
  signedIn,
  organizationId,
  includeExpired,
}: {
  signedIn: boolean;
  organizationId?: number;
  includeExpired?: boolean;
}): Promise<Announcement[]> {
  const conditions = [audienceFilter(signedIn)];
  const params: unknown[] = [];

  if (organizationId !== undefined) {
    params.push(organizationId);
    conditions.push(`a.organization_id = $${params.length}`);
  }

  if (includeExpired !== true) {
    conditions.push(currentFilter());
  }

  const query = `${SELECT_ROWS} WHERE ${conditions.join(' AND ')} ORDER BY a.ends_on ASC`;

  const rows = (await sql.query(query, params)) as AnnouncementRow[];

  return rows.map(mapRow);
});

export const getAnnouncementById = cache(async function getAnnouncementById(
  id: number,
  signedIn: boolean
): Promise<Announcement | undefined> {
  const rows = (await sql.query(
    `${SELECT_ROWS} WHERE a.id = $1 AND ${audienceFilter(signedIn)}`,
    [id]
  )) as AnnouncementRow[];
  return rows[0] ? mapRow(rows[0]) : undefined;
});

export async function addAnnouncement(
  input: AnnouncementInput,
  createdBy: number | null
): Promise<number> {
  const rows = (await sql.query(
    `INSERT INTO announcements
       (organization_id, title, body, starts_on, ends_on, audience, created_by)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [
      input.organizationId,
      input.title,
      input.body,
      input.startsOn,
      input.endsOn,
      input.audience,
      createdBy,
    ]
  )) as { id: number }[];
  return rows[0].id;
}

export async function updateAnnouncement(id: number, input: AnnouncementInput): Promise<void> {
  await sql.query(
    `UPDATE announcements
        SET organization_id = $1,
            title = $2,
            body = $3,
            starts_on = $4,
            ends_on = $5,
            audience = $6
      WHERE id = $7`,
    [
      input.organizationId,
      input.title,
      input.body,
      input.startsOn,
      input.endsOn,
      input.audience,
      id,
    ]
  );
}

export async function deleteAnnouncement(id: number): Promise<void> {
  await sql.query(`DELETE FROM announcements WHERE id = $1`, [id]);
}

// Which organization an announcement belongs to. `null` means it exists and
// belongs to the whole unit (only an admin may edit it); `undefined` means no
// such announcement, and callers must fail silently rather than treat a
// missing row as unit-wide. `undefined` and `null` are both falsy, so a
// `if (!organizationId)` test would be precisely the bug to avoid.
export async function getAnnouncementOrganizationId(
  id: number
): Promise<number | null | undefined> {
  const rows = (await sql.query(
    `SELECT organization_id FROM announcements WHERE id = $1`,
    [id]
  )) as { organization_id: number | null }[];
  if (rows.length === 0) {
    return undefined;
  }
  return rows[0].organization_id;
}
