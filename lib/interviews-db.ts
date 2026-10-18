import { sql } from './db';
import type {
  Interview,
  InterviewKind,
  InterviewMode,
  InterviewStatus,
  InterviewerKey,
} from './interviews-rules';

// Phones are sensitive: everything in this file that returns one must only be
// called after requireInterviewAccess() has passed. Never log a row from here.

export interface BoardRow {
  member: { id: number; fullName: string; phone: string | null; isHead: boolean };
  interviews: Interview[];
}

export type NewInterview = Omit<Interview, 'id' | 'status'>;

interface InterviewRow {
  id: number;
  member_id: number;
  kind: InterviewKind;
  interviewer: InterviewerKey;
  starts_at: string;
  duration_minutes: number;
  mode: InterviewMode;
  online_link: string | null;
  status: InterviewStatus;
}

// starts_at is read as UTC ISO text (same format as Date.toISOString) so no
// Date object, and no server time zone, ever gets involved. member_id is left
// out because the board reads it from members instead.
const INTERVIEW_FIELDS = `
  i.id                AS id,
  i.kind              AS kind,
  i.interviewer       AS interviewer,
  to_char(i.starts_at AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"') AS starts_at,
  i.duration_minutes  AS duration_minutes,
  i.mode              AS mode,
  i.online_link       AS online_link,
  i.status            AS status
`;

function mapInterview(row: InterviewRow): Interview {
  return {
    id: row.id,
    memberId: row.member_id,
    kind: row.kind,
    interviewer: row.interviewer,
    startsAt: row.starts_at,
    durationMinutes: row.duration_minutes,
    mode: row.mode,
    onlineLink: row.online_link,
    status: row.status,
  };
}

const byName = new Intl.Collator('pt', { sensitivity: 'base' });

type BoardQueryRow = Omit<InterviewRow, 'id'> & {
  id: number | null;
  member_id: number;
  full_name: string;
  phone: string | null;
  is_head: boolean;
};

// Every member with every interview, in one query: a LEFT JOIN gives one row
// per (member, interview), or one row with null interview columns for a
// member without any, and the rows are grouped back per member here.
// Sorted by name with the same collation as listMembers.
export async function listInterviewBoard(): Promise<BoardRow[]> {
  const rows = (await sql.query(
    `SELECT m.id        AS member_id,
            m.full_name AS full_name,
            m.phone     AS phone,
            m.is_head   AS is_head,
            ${INTERVIEW_FIELDS}
       FROM members m
       LEFT JOIN interviews i
         ON i.member_id = m.id
      ORDER BY m.id, i.starts_at`
  )) as BoardQueryRow[];

  const byMember = new Map<number, BoardRow>();
  for (const row of rows) {
    let entry = byMember.get(row.member_id);
    if (!entry) {
      entry = {
        member: {
          id: row.member_id,
          fullName: row.full_name,
          phone: row.phone,
          isHead: row.is_head,
        },
        interviews: [],
      };
      byMember.set(row.member_id, entry);
    }
    if (row.id !== null) {
      entry.interviews.push(mapInterview({ ...row, id: row.id }));
    }
  }

  return [...byMember.values()].sort((a, b) => byName.compare(a.member.fullName, b.member.fullName));
}

const INSERT_INTERVIEW = `
  INSERT INTO interviews
    (member_id, kind, interviewer, starts_at, duration_minutes, mode, online_link, status, created_by)
  VALUES ($1, $2, $3, $4::timestamptz, $5, $6, $7, 'scheduled', $8)
  RETURNING id`;

function insertParams(data: NewInterview, createdBy: number | null): unknown[] {
  return [
    data.memberId,
    data.kind,
    data.interviewer,
    data.startsAt,
    data.durationMinutes,
    data.mode,
    data.onlineLink,
    createdBy,
  ];
}

export async function insertInterview(data: NewInterview, createdBy: number | null): Promise<number> {
  const rows = (await sql.query(INSERT_INTERVIEW, insertParams(data, createdBy))) as { id: number }[];
  return rows[0].id;
}

export async function setInterviewStatus(id: number, status: InterviewStatus): Promise<void> {
  await sql.query(`UPDATE interviews SET status = $1 WHERE id = $2`, [status, id]);
}

export async function setMemberPhone(memberId: number, phone: string | null): Promise<void> {
  await sql.query(`UPDATE members SET phone = $1 WHERE id = $2`, [phone, memberId]);
}

// The scheduled interviews of one interviewer: the only ones that can clash.
export async function listScheduledFor(interviewer: InterviewerKey): Promise<Interview[]> {
  const rows = (await sql.query(
    `SELECT i.member_id AS member_id, ${INTERVIEW_FIELDS}
       FROM interviews i
      WHERE i.interviewer = $1 AND i.status = 'scheduled'
      ORDER BY i.starts_at`,
    [interviewer]
  )) as InterviewRow[];
  return rows.map(mapInterview);
}

export async function getInterview(id: number): Promise<Interview | undefined> {
  const rows = (await sql.query(`SELECT i.member_id AS member_id, ${INTERVIEW_FIELDS} FROM interviews i WHERE i.id = $1`, [
    id,
  ])) as InterviewRow[];
  return rows[0] ? mapInterview(rows[0]) : undefined;
}

// Moving an interview keeps its history: the old row becomes `rescheduled`
// and a new `scheduled` row is inserted, both in one transaction so a failed
// insert never leaves the family without its active interview. The update
// only matches a row that is still scheduled; the action checks that first.
export async function rescheduleInterview(
  oldId: number,
  data: NewInterview,
  createdBy: number | null
): Promise<number> {
  const [, inserted] = (await sql.transaction([
    sql.query(
      `UPDATE interviews SET status = 'rescheduled' WHERE id = $1 AND status = 'scheduled'`,
      [oldId]
    ),
    sql.query(INSERT_INTERVIEW, insertParams(data, createdBy)),
  ])) as [unknown, { id: number }[]];
  return inserted[0].id;
}
