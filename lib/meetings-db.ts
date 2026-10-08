import { cache } from 'react';
import { sql } from './db';
import type { SacramentMeeting } from './types';
import type { MeetingProgram } from './speakers';

// The meetings list shows this many meetings per page.
export const PAGE_SIZE = 5;

// Shape of a raw database row: snake_case columns, exactly as Postgres returns
// them. The Neon driver already parses JSONB columns (opening_hymn, speakers, …)
// into JS objects/arrays, and TEXT[] (announcements) into a JS string array, so
// there is no JSON.parse to do here.
interface MeetingRow {
  id: number;
  date: string; // forced to 'YYYY-MM-DD' text by to_char() in the SELECT
  meeting_type: SacramentMeeting['meetingType'];
  presiding: string | null;
  conducting: string | null;
  announcements: string[] | null;
  opening_hymn: SacramentMeeting['openingHymn'];
  opening_prayer: string | null;
  ward_business: SacramentMeeting['wardBusiness'] | null;
  stake_business: boolean;
  sacrament_hymn: SacramentMeeting['sacramentHymn'];
  speakers: SacramentMeeting['program'] | null;
  closing_hymn: SacramentMeeting['closingHymn'];
  closing_prayer: string | null;
}

// Translate one snake_case DB row into the camelCase shape the UI expects.
// Two deliberate bridges live here:
//   - column `speakers` maps to field `program` (our ordered speaker / musical-
//     number list), keeping the richer Week 02 type while using the assignment's
//     column name.
//   - a null JSON array falls back to [] so components can .map() safely.
function mapRow(row: MeetingRow): SacramentMeeting {
  return {
    id: row.id,
    date: row.date,
    meetingType: row.meeting_type,
    presiding: row.presiding,
    conducting: row.conducting,
    announcements: row.announcements ?? [],
    openingHymn: row.opening_hymn,
    openingPrayer: row.opening_prayer,
    wardBusiness: row.ward_business ?? [],
    stakeBusiness: row.stake_business,
    sacramentHymn: row.sacrament_hymn,
    program: row.speakers ?? [],
    closingHymn: row.closing_hymn,
    closingPrayer: row.closing_prayer,
  };
}

// Every SELECT pulls the same columns. to_char() turns the DATE into a plain
// 'YYYY-MM-DD' string so it never arrives as a timezone-sensitive Date object
// (the exact class of bug that breaks a `date === string` comparison).
const SELECT_COLUMNS = `
  id,
  to_char(date, 'YYYY-MM-DD') AS date,
  meeting_type,
  presiding,
  conducting,
  announcements,
  opening_hymn,
  opening_prayer,
  ward_business,
  stake_business,
  sacrament_hymn,
  speakers,
  closing_hymn,
  closing_prayer
`;

// Shared text-search filter (used by getMeetings and countMeetings). A NULL
// search term ($1) disables the filter, so everything matches.
const SEARCH_FILTER = `
  ($1::text IS NULL
   OR presiding ILIKE $1
   OR conducting ILIKE $1
   OR meeting_type ILIKE $1
   OR speakers::text ILIKE $1)
`;

// Read a list of meetings. Every argument is optional:
//   - date:  exact-date filter (used by the /api/meetings?date= route)
//   - query: free-text search over presiding / conducting / type / speakers
//   - page:  1-based page number; when present, results are limited to PAGE_SIZE
export async function getMeetings(
  params: { date?: string; query?: string; page?: number } = {}
): Promise<SacramentMeeting[]> {
  const { date, query, page } = params;
  const search = query ? `%${query}%` : null;
  const paginate = typeof page === 'number';
  const limit = paginate ? PAGE_SIZE : null; // LIMIT NULL = no limit (all rows)
  const offset = paginate && page > 1 ? (page - 1) * PAGE_SIZE : 0;

  const rows = (await sql.query(
    `SELECT ${SELECT_COLUMNS}
       FROM meetings
      WHERE ($2::date IS NULL OR date = $2::date)
        AND ${SEARCH_FILTER}
      ORDER BY date DESC
      LIMIT $3::int OFFSET $4::int`,
    [search, date ?? null, limit, offset]
  )) as MeetingRow[];

  return rows.map(mapRow);
}

// Count how many meetings match a search term. Used to compute the page count.
export async function countMeetings(
  params: { query?: string } = {}
): Promise<number> {
  const search = params.query ? `%${params.query}%` : null;
  const rows = (await sql.query(
    `SELECT COUNT(*)::int AS count FROM meetings WHERE ${SEARCH_FILTER}`,
    [search]
  )) as { count: number }[];
  return rows[0]?.count ?? 0;
}

// Read a single meeting by id. Returns undefined for a missing or non-integer id.
// Wrapped in cache() so generateMetadata() and the page component (which both
// need the same meeting) share one query per request instead of two.
export const getMeetingById = cache(async function getMeetingById(
  id: number
): Promise<SacramentMeeting | undefined> {
  if (!Number.isInteger(id)) {
    return undefined;
  }
  const rows = (await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM meetings WHERE id = $1`,
    [id]
  )) as MeetingRow[];
  return rows[0] ? mapRow(rows[0]) : undefined;
});

// "Current" = the most recent meeting on or before today. If every meeting is
// still in the future, fall back to the earliest one.
export async function getCurrentMeeting(): Promise<SacramentMeeting | undefined> {
  const past = (await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM meetings
      WHERE date <= CURRENT_DATE
      ORDER BY date DESC
      LIMIT 1`
  )) as MeetingRow[];
  if (past[0]) {
    return mapRow(past[0]);
  }

  const upcoming = (await sql.query(
    `SELECT ${SELECT_COLUMNS} FROM meetings ORDER BY date ASC LIMIT 1`
  )) as MeetingRow[];
  return upcoming[0] ? mapRow(upcoming[0]) : undefined;
}

// Every meeting's date and program, oldest first, for the speakers summary.
export async function getSpeakerAppearances(): Promise<MeetingProgram[]> {
  const rows = (await sql.query(
    `SELECT id, to_char(date, 'YYYY-MM-DD') AS date, speakers
       FROM meetings
      ORDER BY date ASC, id ASC`
  )) as Pick<MeetingRow, 'id' | 'date' | 'speakers'>[];
  return rows.map((row) => ({ id: row.id, date: row.date, program: row.speakers ?? [] }));
}

// --- Mutations (Week 04) --------------------------------------------------

// Everything needed to insert or update a meeting: a full meeting minus the id
// (the database assigns the id on insert).
export type MeetingInput = Omit<SacramentMeeting, 'id'>;

// An undecided hymn must reach Postgres as SQL NULL: JSON.stringify(null) would
// store the JSON value null instead, which IS NULL does not match.
function jsonOrNull(value: unknown): string | null {
  return value === null ? null : JSON.stringify(value);
}

// The 13 column values, in the same order every mutation uses. JSONB columns
// (the hymns, ward_business, speakers) are stringified and cast ::jsonb in the
// SQL; announcements is a real text[] so it goes as a JS array cast ::text[].
function columnValues(m: MeetingInput): unknown[] {
  return [
    m.date,
    m.meetingType,
    m.presiding,
    m.conducting,
    m.announcements ?? [],
    jsonOrNull(m.openingHymn),
    m.openingPrayer,
    JSON.stringify(m.wardBusiness ?? []),
    m.stakeBusiness,
    jsonOrNull(m.sacramentHymn),
    JSON.stringify(m.program ?? []),
    jsonOrNull(m.closingHymn),
    m.closingPrayer,
  ];
}

export type MeetingChangeAction = 'created' | 'updated' | 'deleted';

// One line of a meeting's history. `changedBy` is the e-mail (or username) the
// account had at the time, or null when the change could not be attributed.
export interface MeetingChange {
  id: number;
  action: MeetingChangeAction;
  changedBy: string | null;
  changedAt: string;
}

// Appended to a mutation whose first CTE is named `changed` and returns the
// meeting's id and date. Because the history row is written by the same
// statement, a meeting can never change without it, and a failed change (a
// duplicate date, say) leaves no history behind. `userParam` is the
// placeholder holding the acting user's id; the action comes from a closed
// union, never from a request.
function recordChange(action: MeetingChangeAction, userParam: string): string {
  return `, recorded AS (
       INSERT INTO meeting_changes (meeting_id, meeting_date, action, changed_by, changed_by_label)
       SELECT id, date, '${action}', ${userParam}::int,
              (SELECT COALESCE(email, username) FROM users WHERE id = ${userParam}::int)
         FROM changed
     )
     SELECT id FROM changed`;
}

// Insert a new meeting and return its generated id. `changedBy` is the id of
// the signed-in user, or null if the session carried no usable id.
export async function addMeeting(
  input: MeetingInput,
  changedBy: number | null
): Promise<number> {
  const rows = (await sql.query(
    `WITH changed AS (
       INSERT INTO meetings
         (date, meeting_type, presiding, conducting, announcements,
          opening_hymn, opening_prayer, ward_business, stake_business,
          sacrament_hymn, speakers, closing_hymn, closing_prayer)
       VALUES
         ($1::date, $2, $3, $4, $5::text[],
          $6::jsonb, $7, $8::jsonb, $9::boolean,
          $10::jsonb, $11::jsonb, $12::jsonb, $13)
       RETURNING id, date
     )${recordChange('created', '$14')}`,
    [...columnValues(input), changedBy]
  )) as { id: number }[];
  return rows[0].id;
}

// Overwrite every column of an existing meeting. Returns false if no row had
// that id (so the caller can surface a "not found" instead of a silent no-op).
export async function updateMeeting(
  id: number,
  input: MeetingInput,
  changedBy: number | null
): Promise<boolean> {
  const rows = (await sql.query(
    `WITH changed AS (
       UPDATE meetings SET
          date = $1::date, meeting_type = $2, presiding = $3, conducting = $4,
          announcements = $5::text[], opening_hymn = $6::jsonb, opening_prayer = $7,
          ward_business = $8::jsonb, stake_business = $9::boolean,
          sacrament_hymn = $10::jsonb, speakers = $11::jsonb,
          closing_hymn = $12::jsonb, closing_prayer = $13
        WHERE id = $14
        RETURNING id, date
     )${recordChange('updated', '$15')}`,
    [...columnValues(input), id, changedBy]
  )) as { id: number }[];
  return rows.length > 0;
}

// Delete a meeting by id. Returns false if no row matched.
export async function deleteMeeting(
  id: number,
  changedBy: number | null
): Promise<boolean> {
  const rows = (await sql.query(
    `WITH changed AS (
       DELETE FROM meetings WHERE id = $1 RETURNING id, date
     )${recordChange('deleted', '$2')}`,
    [id, changedBy]
  )) as { id: number }[];
  return rows.length > 0;
}

// A meeting's history, newest first. Admin-only: the caller gates access.
export async function getMeetingChanges(meetingId: number): Promise<MeetingChange[]> {
  const rows = (await sql.query(
    `SELECT id, action, changed_by_label, changed_at
       FROM meeting_changes
      WHERE meeting_id = $1
      ORDER BY changed_at DESC, id DESC`,
    [meetingId]
  )) as {
    id: number;
    action: MeetingChangeAction;
    changed_by_label: string | null;
    changed_at: Date | string;
  }[];
  return rows.map((row) => ({
    id: row.id,
    action: row.action,
    changedBy: row.changed_by_label,
    changedAt: new Date(row.changed_at).toISOString(),
  }));
}
