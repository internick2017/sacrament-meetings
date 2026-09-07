import { cache } from 'react';
import { sql } from './db';
import type { Calling, OrganizationKey, OrganizationWithCallings } from './types';

// One row per calling, already joined with its organization and person. A single
// query is used instead of one per organization: seven round trips to fetch a
// page that shows a handful of rows is not a trade worth making.
interface CallingRow {
  organization_id: number;
  org_key: OrganizationKey;
  org_display_order: number;
  calling_id: number | null;
  title: string | null;
  person_id: number | null;
  full_name: string | null;
  photo_url: string | null;
  calling_display_order: number | null;
}

// The LEFT JOIN matters: an organization with nobody called yet must still
// appear, so the page can say "no one is listed here" instead of pretending the
// organization does not exist.
const SELECT_ROWS = `
  SELECT o.id                AS organization_id,
         o.org_key           AS org_key,
         o.display_order     AS org_display_order,
         c.id                AS calling_id,
         c.title             AS title,
         c.person_id         AS person_id,
         p.full_name         AS full_name,
         p.photo_url         AS photo_url,
         c.display_order     AS calling_display_order
    FROM organizations o
    LEFT JOIN callings c
      ON c.organization_id = o.id
     AND c.ended_on IS NULL
    LEFT JOIN people p
      ON p.id = c.person_id
   WHERE o.active = true
`;

const ORDER_BY = ` ORDER BY o.display_order, o.id, c.display_order, c.id`;

// Fold the flat join result back into one entry per organization.
function groupRows(rows: CallingRow[]): OrganizationWithCallings[] {
  const byId = new Map<number, OrganizationWithCallings>();

  for (const row of rows) {
    let org = byId.get(row.organization_id);
    if (!org) {
      org = {
        id: row.organization_id,
        key: row.org_key,
        displayOrder: row.org_display_order,
        callings: [],
      };
      byId.set(row.organization_id, org);
    }

    // A LEFT JOIN with no match still produces a row, with every calling column
    // null. That is an organization with nobody called, not a calling.
    if (row.calling_id !== null) {
      org.callings.push({
        id: row.calling_id,
        title: row.title ?? '',
        personId: row.person_id ?? 0,
        personName: row.full_name ?? undefined,
        personPhotoUrl: row.photo_url ?? undefined,
        displayOrder: row.calling_display_order ?? 0,
      });
    }
  }

  return [...byId.values()];
}

// Strip every person name. This is the whole privacy rule of the public layer,
// and it is deliberately a separate pure function rather than a flag threaded
// through the SQL: it can be unit tested, and a reviewer can read it in one
// glance. Returns new objects; the input is never mutated.
export function hideNames(orgs: OrganizationWithCallings[]): OrganizationWithCallings[] {
  return orgs.map((org) => ({
    ...org,
    callings: org.callings.map(
      ({
        personName: _personName,
        personId: _personId,
        personPhotoUrl: _personPhotoUrl,
        ...calling
      }: Calling) => calling
    ),
  }));
}

// `includeNames` is a plain boolean rather than an options object on purpose:
// React's cache() keys on argument identity, and a fresh `{ includeNames: true }`
// literal on every call would defeat the deduplication entirely.
export const getOrganizations = cache(async function getOrganizations(
  includeNames: boolean
): Promise<OrganizationWithCallings[]> {
  const rows = (await sql.query(SELECT_ROWS + ORDER_BY)) as CallingRow[];
  const orgs = groupRows(rows);
  return includeNames ? orgs : hideNames(orgs);
});

export async function getOrganizationIdByKey(key: string): Promise<number | undefined> {
  const rows = (await sql.query(
    `SELECT id FROM organizations WHERE org_key = $1`,
    [key]
  )) as { id: number }[];
  return rows[0]?.id;
}

// The inverse lookup: an organization's own key from its id. Needed by the
// photo-approval flow, which must derive the approval rule (needsApproval,
// in lib/photo-rules.ts) from the activity's organization on the server,
// never from anything a form submits. `undefined` means no such
// organization.
export async function getOrganizationKeyById(
  id: number
): Promise<OrganizationKey | undefined> {
  const rows = (await sql.query(
    `SELECT org_key FROM organizations WHERE id = $1`,
    [id]
  )) as { org_key: OrganizationKey }[];
  return rows[0]?.org_key;
}

// Which organization a calling belongs to. Needed before ending or deleting
// one, so a leader cannot act on another organization's calling by guessing an
// id.
export async function getCallingOrganizationId(
  callingId: number
): Promise<number | undefined> {
  const rows = (await sql.query(
    `SELECT organization_id FROM callings WHERE id = $1`,
    [callingId]
  )) as { organization_id: number }[];
  return rows[0]?.organization_id;
}

export const getOrganizationByKey = cache(async function getOrganizationByKey(
  key: string,
  includeNames: boolean
): Promise<OrganizationWithCallings | undefined> {
  const rows = (await sql.query(
    `${SELECT_ROWS} AND o.org_key = $1 ${ORDER_BY}`,
    [key]
  )) as CallingRow[];
  const orgs = groupRows(rows);
  const found = orgs[0];
  if (!found) {
    return undefined;
  }
  return includeNames ? found : hideNames([found])[0];
});
