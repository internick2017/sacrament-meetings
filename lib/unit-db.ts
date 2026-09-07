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
export const getUnit = cache(async function getUnit(): Promise<Unit> {
  const rows = (await sql.query(
    `SELECT id, name, unit_type, stake_name, address, meeting_times,
            timezone, calendar_url, directory_url, contact_note
       FROM unit WHERE id = 1`
  )) as UnitRow[];
  return rows[0] ? mapRow(rows[0]) : EMPTY_UNIT;
});

export type UnitInput = Omit<Unit, 'id'>;

// Always an UPDATE of row 1: the row is created by migration 002 and the table
// forbids any other id, so there is no insert path to worry about.
export async function updateUnit(input: UnitInput): Promise<void> {
  await sql.query(
    `UPDATE unit SET
        name = $1, unit_type = $2, stake_name = $3, address = $4,
        meeting_times = $5, timezone = $6, calendar_url = $7,
        directory_url = $8, contact_note = $9, updated_at = now()
      WHERE id = 1`,
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
