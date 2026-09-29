import type { ProgramItem } from './types';

export interface MeetingProgram {
  id: number;
  date: string; // 'YYYY-MM-DD'
  program: ProgramItem[];
}

export interface MeetingRef {
  date: string;
  meetingId: number;
}

export interface SpeakerSummary {
  name: string;
  timesSpoken: number;
  lastSpoke: MeetingRef | null;
  nextScheduled: MeetingRef | null;
}

// Clerks append the calling to a name ("Fulano (bispo)", "Fulana (FSY)"), so
// the same person shows up under several spellings.
function stripRole(raw: string): string {
  return raw
    .replace(/\s*\([^()]*\)\s*$/, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Accent-, case- and whitespace-insensitive, for the search box.
export function foldSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

export function foldName(raw: string): string {
  return foldSearch(stripRole(raw));
}

const byName = new Intl.Collator('pt', { sensitivity: 'base' });

export function summarizeSpeakers(
  meetings: MeetingProgram[],
  today: string
): SpeakerSummary[] {
  const chronological = [...meetings].sort(
    (a, b) => a.date.localeCompare(b.date) || a.id - b.id
  );
  const people = new Map<string, SpeakerSummary>();

  for (const meeting of chronological) {
    const ref = { date: meeting.date, meetingId: meeting.id };
    const seenHere = new Set<string>();

    for (const item of meeting.program) {
      if (item.type !== 'speaker') continue;
      const name = stripRole(item.name);
      const key = foldName(item.name);
      if (!key || seenHere.has(key)) continue;
      seenHere.add(key);

      const row = people.get(key) ?? {
        name,
        timesSpoken: 0,
        lastSpoke: null,
        nextScheduled: null,
      };
      // Iterating in date order, so the last write is the latest spelling.
      row.name = name;
      if (meeting.date <= today) {
        row.timesSpoken += 1;
        row.lastSpoke = ref;
      } else if (!row.nextScheduled) {
        row.nextScheduled = ref;
      }
      people.set(key, row);
    }
  }

  return [...people.values()].sort((a, b) => {
    if (a.lastSpoke && b.lastSpoke) {
      const byDate = a.lastSpoke.date.localeCompare(b.lastSpoke.date);
      if (byDate !== 0) return byDate;
    } else if (a.lastSpoke || b.lastSpoke) {
      return a.lastSpoke ? -1 : 1;
    }
    return byName.compare(a.name, b.name);
  });
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function weeksBetween(from: string, to: string): number {
  const days = (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / DAY_MS;
  return Math.floor(days / 7);
}
