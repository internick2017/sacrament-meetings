import { cache } from 'react';
import { sql } from './db';
import type { Unit, UnitType } from './types';

// Raw row: snake_case exactly as Postgres returns it.
interface UnitRow {
  id: number;
  name: string;
  unit_type: UnitType;
  stake_name: string;
  address: string;
  meeting_times: string;
  timezone: string;
  calendar_url: string;
  directory_url: string;
  contact_note: string;
}

function mapRow(row: UnitRow): Unit {
  return {
    id: row.id,
    name: row.name,
    unitType: row.unit_type,
    stakeName: row.stake_name,
    address: row.address,
    meetingTimes: row.meeting_times,
    timezone: row.timezone,
    calendarUrl: row.calendar_url,
    directoryUrl: row.directory_url,
    contactNote: row.contact_note,
  };
}

// The unit as it should look before anyone has configured it. Returned instead
// of throwing when row 1 is missing, so a fresh database renders an empty home
// page rather than a 500.
const EMPTY_UNIT: Unit = {
  id: 1,
  name: '',
  unitType: 'branch',
  stakeName: '',
  address: '',
  meetingTimes: '',
  timezone: 'America/Sao_Paulo',
  calendarUrl: '',
  directoryUrl: '',
  contactNote: '',
};

// There is exactly one unit, so there is no id parameter. Wrapped in cache()
// because the home page, the header and generateMetadata all want it within a
// single request.
// Also falls back to EMPTY_UNIT if the query itself throws (for example the
// `unit` table does not exist yet because migrations have not been applied
// to this environment), so a deploy that lands before `yarn migrate` shows an
// empty home page instead of a 500 for every visitor. The error is still
// logged so the missing migration is visible, not silently swallowed.
export const getUnit = cache(async function getUnit(): Promise<Unit> {
  try {
    const rows = (await sql.query(
      `SELECT id, name, unit_type, stake_name, address, meeting_times,
              timezone, calendar_url, directory_url, contact_note
         FROM unit WHERE id = 1`
    )) as UnitRow[];
    return rows[0] ? mapRow(rows[0]) : EMPTY_UNIT;
  } catch (error) {
    console.error('getUnit: falling back to EMPTY_UNIT after query failure', error);
    return EMPTY_UNIT;
  }
});

export type UnitInput = Omit<Unit, 'id'>;

// An upsert of row 1, not a plain UPDATE: row 1 is normally seeded by
// migration 002, but if it is ever missing (deleted manually, or a future
// environment gets the table without the seed), an UPDATE would match zero
// rows and silently discard the clerk's changes while still reporting
// success. The table's CHECK (id = 1) guarantees the single-row invariant
// regardless of which branch runs.
export async function updateUnit(input: UnitInput): Promise<void> {
  await sql.query(
    `INSERT INTO unit (id, name, unit_type, stake_name, address,
        meeting_times, timezone, calendar_url, directory_url, contact_note)
      VALUES (1, $1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (id) DO UPDATE SET
        name = excluded.name,
        unit_type = excluded.unit_type,
        stake_name = excluded.stake_name,
        address = excluded.address,
        meeting_times = excluded.meeting_times,
        timezone = excluded.timezone,
        calendar_url = excluded.calendar_url,
        directory_url = excluded.directory_url,
        contact_note = excluded.contact_note,
        updated_at = now()`,
    [
      input.name,
      input.unitType,
      input.stakeName,
      input.address,
      input.meetingTimes,
      input.timezone,
      input.calendarUrl,
      input.directoryUrl,
      input.contactNote,
    ]
  );
}
