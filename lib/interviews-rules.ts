// Pure rules for bishopric interviews. No database and no auth imports, so
// every rule can be tested exhaustively and reused by actions and screens.

export const INTERVIEWERS = [
  { key: 'nick', name: 'Nick Granados' },
  { key: 'rafael', name: 'Rafael Colmenares' },
  { key: 'jared', name: 'Jared Aponte' },
] as const;

export type InterviewerKey = (typeof INTERVIEWERS)[number]['key'];
export type InterviewKind = 'tithing' | 'individual';
export type InterviewStatus = 'scheduled' | 'done' | 'rescheduled' | 'cancelled';
export type InterviewMode = 'in_person' | 'online';

export interface Interview {
  id: number;
  memberId: number;
  kind: InterviewKind;
  interviewer: InterviewerKey;
  startsAt: string; // ISO, UTC
  durationMinutes: number;
  mode: InterviewMode;
  onlineLink: string | null;
  status: InterviewStatus;
}

// Tithing settlement is only done by Nick. This mirrors the CHECK constraint
// in the database so the UI can reject it before a write is attempted.
export function interviewerAllowedFor(
  kind: InterviewKind,
  interviewer: InterviewerKey
): boolean {
  return kind !== 'tithing' || interviewer === 'nick';
}

const MINUTE_MS = 60_000;

function endMs(startsAt: string, durationMinutes: number): number {
  return Date.parse(startsAt) + durationMinutes * MINUTE_MS;
}

// Interviews of the same interviewer that overlap the candidate. Only
// `scheduled` ones block a slot: done, cancelled and rescheduled free it.
// Intervals are half-open, so back-to-back slots do not clash. `ignoreId`
// leaves out the interview being edited so it never conflicts with itself.
export function findConflicts(
  candidate: {
    interviewer: InterviewerKey;
    startsAt: string;
    durationMinutes: number;
  },
  existing: Interview[],
  ignoreId?: number
): Interview[] {
  const start = Date.parse(candidate.startsAt);
  const end = endMs(candidate.startsAt, candidate.durationMinutes);

  return existing.filter((other) => {
    if (other.id === ignoreId) return false;
    if (other.status !== 'scheduled') return false;
    if (other.interviewer !== candidate.interviewer) return false;
    return (
      start < endMs(other.startsAt, other.durationMinutes) &&
      Date.parse(other.startsAt) < end
    );
  });
}

// Where a family stands with its tithing settlement. Cancelled and
// rescheduled interviews no longer count; of the rest, the most recent
// decides (a newer scheduled one means it is pending again).
export function familyStatus(
  tithing: Interview[]
): 'none' | 'scheduled' | 'done' {
  let latest: Interview | null = null;
  for (const interview of tithing) {
    if (interview.status !== 'scheduled' && interview.status !== 'done') {
      continue;
    }
    if (!latest || Date.parse(interview.startsAt) > Date.parse(latest.startsAt)) {
      latest = interview;
    }
  }
  return latest ? (latest.status as 'scheduled' | 'done') : 'none';
}

// startsAt of the most recent interview that actually took place, or null.
export function lastInterviewed(interviews: Interview[]): string | null {
  let best: string | null = null;
  for (const interview of interviews) {
    if (interview.status !== 'done') continue;
    if (best === null || Date.parse(interview.startsAt) > Date.parse(best)) {
      best = interview.startsAt;
    }
  }
  return best;
}
