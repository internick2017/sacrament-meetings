// Pure view logic for the interviews board: which rows a filter shows, in
// what order, and the count on each filter tab. No database or React here.

import type { BoardRow } from './interviews-db';
import { familyStatus, lastInterviewed, type Interview } from './interviews-rules';
import { foldSearch } from './speakers';

export const BOARD_FILTERS = ['none', 'scheduled', 'done', 'individual'] as const;
export type BoardFilter = (typeof BOARD_FILTERS)[number];

export function parseBoardFilter(value: string | string[] | undefined): BoardFilter {
  const first = Array.isArray(value) ? value[0] : value;
  return (BOARD_FILTERS as readonly string[]).includes(first ?? '') ? (first as BoardFilter) : 'none';
}

export type BoardMember = BoardRow['member'];

export interface FamilyEntry {
  member: BoardMember;
  status: 'none' | 'scheduled' | 'done';
  // Date of the last tithing interview that took place.
  lastInterviewed: string | null;
  // The pending tithing interview, when there is one.
  active: Interview | null;
}

export interface IndividualEntry {
  member: BoardMember;
  interview: Interview;
}

export interface Board {
  families: FamilyEntry[];
  individual: IndividualEntry[];
  counts: Record<BoardFilter, number>;
  // No member is marked as head of family yet (the import has not run).
  noHeads: boolean;
}

function toFamily(row: BoardRow): FamilyEntry {
  const tithing = row.interviews.filter((interview) => interview.kind === 'tithing');
  return {
    member: row.member,
    status: familyStatus(tithing),
    lastInterviewed: lastInterviewed(tithing),
    active: tithing.find((interview) => interview.status === 'scheduled') ?? null,
  };
}

// The individual agenda: what is pending or already held. Cancelled and
// rescheduled rows are history that a newer row (or nothing) replaces.
function individualEntries(rows: BoardRow[]): IndividualEntry[] {
  const entries: IndividualEntry[] = [];
  for (const row of rows) {
    for (const interview of row.interviews) {
      if (interview.kind !== 'individual') continue;
      if (interview.status !== 'scheduled' && interview.status !== 'done') continue;
      entries.push({ member: row.member, interview });
    }
  }
  return entries.sort((a, b) => Date.parse(a.interview.startsAt) - Date.parse(b.interview.startsAt));
}

// Rows arrive sorted by name (listInterviewBoard), and that order is kept.
export function buildBoard(rows: BoardRow[], filter: BoardFilter, query: string): Board {
  const families = rows.filter((row) => row.member.isHead).map(toFamily);
  const individual = individualEntries(rows);

  const counts: Record<BoardFilter, number> = {
    none: 0,
    scheduled: 0,
    done: 0,
    individual: individual.length,
  };
  for (const family of families) counts[family.status] += 1;

  const needle = foldSearch(query);
  const matches = (member: BoardMember) => !needle || foldSearch(member.fullName).includes(needle);

  return {
    families:
      filter === 'individual'
        ? []
        : families.filter((family) => family.status === filter && matches(family.member)),
    individual: filter === 'individual' ? individual.filter((entry) => matches(entry.member)) : [],
    counts,
    noHeads: families.length === 0,
  };
}
