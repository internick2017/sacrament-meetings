import { sql } from './db';
import type { SacramentMeeting } from './types';

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
  presiding: string;
  conducting: string;
  announcements: string[] | null;
  opening_hymn: SacramentMeeting['openingHymn'];
  opening_prayer: string;
  ward_business: SacramentMeeting['wardBusiness'] | null;
  stake_business: boolean;
  sacrament_hymn: SacramentMeeting['sacramentHymn'];
  speakers: SacramentMeeting['program'] | null;
  closing_hymn: SacramentMeeting['closingHymn'];
  closing_prayer: string;
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
export async function getMeetingById(
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
}

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

// --- Mutations (Week 04) --------------------------------------------------

// Everything needed to insert or update a meeting: a full meeting minus the id
// (the database assigns the id on insert).
export type MeetingInput = Omit<SacramentMeeting, 'id'>;

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
    JSON.stringify(m.openingHymn),
    m.openingPrayer,
    JSON.stringify(m.wardBusiness ?? []),
    m.stakeBusiness,
    JSON.stringify(m.sacramentHymn),
    JSON.stringify(m.program ?? []),
    JSON.stringify(m.closingHymn),
    m.closingPrayer,
  ];
}

// Insert a new meeting and return its generated id.
export async function addMeeting(input: MeetingInput): Promise<number> {
  const rows = (await sql.query(
    `INSERT INTO meetings
       (date, meeting_type, presiding, conducting, announcements,
        opening_hymn, opening_prayer, ward_business, stake_business,
        sacrament_hymn, speakers, closing_hymn, closing_prayer)
     VALUES
       ($1::date, $2, $3, $4, $5::text[],
        $6::jsonb, $7, $8::jsonb, $9::boolean,
        $10::jsonb, $11::jsonb, $12::jsonb, $13)
     RETURNING id`,
    columnValues(input)
  )) as { id: number }[];
  return rows[0].id;
}

// Overwrite every column of an existing meeting. Returns false if no row had
// that id (so the caller can surface a "not found" instead of a silent no-op).
export async function updateMeeting(
  id: number,
  input: MeetingInput
): Promise<boolean> {
  const rows = (await sql.query(
    `UPDATE meetings SET
        date = $1::date, meeting_type = $2, presiding = $3, conducting = $4,
        announcements = $5::text[], opening_hymn = $6::jsonb, opening_prayer = $7,
        ward_business = $8::jsonb, stake_business = $9::boolean,
        sacrament_hymn = $10::jsonb, speakers = $11::jsonb,
        closing_hymn = $12::jsonb, closing_prayer = $13
      WHERE id = $14
      RETURNING id`,
    [...columnValues(input), id]
  )) as { id: number }[];
  return rows.length > 0;
}

// Delete a meeting by id. Returns false if no row matched.
export async function deleteMeeting(id: number): Promise<boolean> {
  const rows = (await sql.query(
    `DELETE FROM meetings WHERE id = $1 RETURNING id`,
    [id]
  )) as { id: number }[];
  return rows.length > 0;
}
