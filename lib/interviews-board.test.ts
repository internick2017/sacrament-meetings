import { describe, expect, it } from 'vitest';
import { buildBoard, parseBoardFilter } from './interviews-board';
import type { BoardRow } from './interviews-db';
import type { Interview } from './interviews-rules';

let nextId = 1;
function interview(over: Partial<Interview> = {}): Interview {
  return {
    id: nextId++,
    memberId: 1,
    kind: 'tithing',
    interviewer: 'nick',
    startsAt: '2026-10-20T14:00:00.000Z',
    durationMinutes: 30,
    mode: 'in_person',
    onlineLink: null,
    status: 'scheduled',
    ...over,
  };
}

function row(id: number, fullName: string, isHead: boolean, interviews: Partial<Interview>[] = []): BoardRow {
  return {
    member: { id, fullName, phone: null, isHead },
    interviews: interviews.map((over) => interview({ memberId: id, ...over })),
  };
}

// Three heads, one in each state, plus a non-head with an individual interview.
const rows: BoardRow[] = [
  row(1, 'Ana Souza', true),
  row(2, 'João Pereira', true, [{ status: 'scheduled', startsAt: '2026-10-25T13:00:00.000Z' }]),
  row(3, 'Márcia Lima', true, [
    { status: 'done', startsAt: '2026-09-01T13:00:00.000Z' },
    { status: 'cancelled', startsAt: '2026-10-01T13:00:00.000Z' },
  ]),
  row(4, 'Pedro Alves', false, [
    { kind: 'individual', interviewer: 'rafael', startsAt: '2026-11-02T13:00:00.000Z' },
    { kind: 'individual', interviewer: 'jared', startsAt: '2026-10-22T13:00:00.000Z' },
    { kind: 'individual', status: 'cancelled', startsAt: '2026-10-21T13:00:00.000Z' },
  ]),
];

describe('parseBoardFilter', () => {
  it('accepts the four filters', () => {
    expect(parseBoardFilter('none')).toBe('none');
    expect(parseBoardFilter('scheduled')).toBe('scheduled');
    expect(parseBoardFilter('done')).toBe('done');
    expect(parseBoardFilter('individual')).toBe('individual');
  });

  it('falls back to none for anything else', () => {
    expect(parseBoardFilter(undefined)).toBe('none');
    expect(parseBoardFilter('bogus')).toBe('none');
    expect(parseBoardFilter(['done', 'none'])).toBe('done');
  });
});

describe('buildBoard', () => {
  it('lists only heads in the family filters, by status', () => {
    expect(buildBoard(rows, 'none', '').families.map((f) => f.member.id)).toEqual([1]);
    expect(buildBoard(rows, 'scheduled', '').families.map((f) => f.member.id)).toEqual([2]);
    expect(buildBoard(rows, 'done', '').families.map((f) => f.member.id)).toEqual([3]);
  });

  it('gives each family its status, last interview and active interview', () => {
    const [scheduled] = buildBoard(rows, 'scheduled', '').families;
    expect(scheduled.status).toBe('scheduled');
    expect(scheduled.active?.startsAt).toBe('2026-10-25T13:00:00.000Z');
    expect(scheduled.lastInterviewed).toBeNull();

    const [done] = buildBoard(rows, 'done', '').families;
    expect(done.status).toBe('done');
    expect(done.active).toBeNull();
    expect(done.lastInterviewed).toBe('2026-09-01T13:00:00.000Z');
  });

  it('ignores individual interviews when deciding a family status', () => {
    const head = row(5, 'Zé', true, [{ kind: 'individual', status: 'done' }]);
    const board = buildBoard([head], 'none', '');
    expect(board.families.map((f) => f.member.id)).toEqual([5]);
    expect(board.families[0].lastInterviewed).toBeNull();
  });

  it('counts every filter regardless of the active one or the search', () => {
    const expected = { none: 1, scheduled: 1, done: 1, individual: 2 };
    expect(buildBoard(rows, 'none', '').counts).toEqual(expected);
    expect(buildBoard(rows, 'individual', 'zzz').counts).toEqual(expected);
  });

  it('searches names ignoring accents and case', () => {
    const board = buildBoard(rows, 'scheduled', 'JOAO');
    expect(board.families.map((f) => f.member.id)).toEqual([2]);
    expect(buildBoard(rows, 'done', 'marcia').families).toHaveLength(1);
    expect(buildBoard(rows, 'done', 'ana').families).toHaveLength(0);
  });

  it('lists individual interviews by date, without cancelled or rescheduled ones', () => {
    const board = buildBoard(rows, 'individual', '');
    expect(board.families).toEqual([]);
    expect(board.individual.map((entry) => entry.interview.interviewer)).toEqual(['jared', 'rafael']);
    expect(board.individual[0].member.fullName).toBe('Pedro Alves');
  });

  it('searches individual interviews by name too', () => {
    expect(buildBoard(rows, 'individual', 'pedro').individual).toHaveLength(2);
    expect(buildBoard(rows, 'individual', 'ana').individual).toHaveLength(0);
  });

  it('flags when no heads are loaded yet', () => {
    expect(buildBoard([], 'none', '').noHeads).toBe(true);
    expect(buildBoard([row(9, 'Solo', false)], 'none', '').noHeads).toBe(true);
    expect(buildBoard(rows, 'none', '').noHeads).toBe(false);
  });
});
