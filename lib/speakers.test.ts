import { describe, it, expect } from 'vitest';
import { foldName, summarizeSpeakers, weeksBetween, type MeetingProgram } from './speakers';
import type { ProgramItem } from './types';

const speaker = (name: string): ProgramItem => ({ type: 'speaker', name, topic: '' });

function meeting(id: number, date: string, ...program: ProgramItem[]): MeetingProgram {
  return { id, date, program };
}

const TODAY = '2026-09-27';

describe('summarizeSpeakers', () => {
  it('groups a name with a trailing role in parentheses with the same bare name', () => {
    const rows = summarizeSpeakers(
      [
        meeting(1, '2026-03-01', speaker('Nick Daniel Alejandro Granados Lares (bispo)')),
        meeting(2, '2026-05-03', speaker('Nick Daniel Alejandro Granados Lares')),
      ],
      TODAY
    );

    expect(rows).toEqual([
      {
        name: 'Nick Daniel Alejandro Granados Lares',
        timesSpoken: 2,
        lastSpoke: { date: '2026-05-03', meetingId: 2 },
        nextScheduled: null,
      },
    ]);
  });

  it('folds accents, case and inner whitespace into one person, shown with the latest spelling', () => {
    const rows = summarizeSpeakers(
      [
        meeting(1, '2026-01-04', speaker('kenia  silva')),
        meeting(2, '2026-02-01', speaker('Kênia Silva (FSY)')),
      ],
      TODAY
    );

    expect(rows).toHaveLength(1);
    expect(rows[0].name).toBe('Kênia Silva');
    expect(rows[0].timesSpoken).toBe(2);
  });

  it('counts a future date as the next assignment, not as a talk already given', () => {
    const rows = summarizeSpeakers(
      [
        meeting(1, '2026-06-07', speaker('Ana Souza')),
        meeting(3, '2026-10-18', speaker('Ana Souza')),
        meeting(2, '2026-10-04', speaker('Ana Souza')),
      ],
      TODAY
    );

    expect(rows).toEqual([
      {
        name: 'Ana Souza',
        timesSpoken: 1,
        lastSpoke: { date: '2026-06-07', meetingId: 1 },
        nextScheduled: { date: '2026-10-04', meetingId: 2 },
      },
    ]);
  });

  it('treats a talk dated today as already given', () => {
    const [row] = summarizeSpeakers([meeting(1, TODAY, speaker('Ana Souza'))], TODAY);
    expect(row.timesSpoken).toBe(1);
    expect(row.nextScheduled).toBeNull();
  });

  it('ignores musical numbers and blank speaker names', () => {
    const rows = summarizeSpeakers(
      [
        meeting(
          1,
          '2026-04-05',
          { type: 'musical-number', performer: 'Coro da Ala', title: 'Hino' },
          speaker('   '),
          speaker(' (bispo) '),
          speaker('Pedro Lima')
        ),
      ],
      TODAY
    );

    expect(rows.map((row) => row.name)).toEqual(['Pedro Lima']);
  });

  it('orders by longest since last talk, then people only scheduled, ties by name', () => {
    const rows = summarizeSpeakers(
      [
        meeting(1, '2026-02-01', speaker('Bruno'), speaker('Álvaro')),
        meeting(2, '2026-01-04', speaker('Carla')),
        meeting(3, '2026-08-02', speaker('Débora')),
        meeting(4, '2026-10-04', speaker('Zeca'), speaker('Eduardo')),
      ],
      TODAY
    );

    expect(rows.map((row) => row.name)).toEqual([
      'Carla',
      'Álvaro',
      'Bruno',
      'Débora',
      'Eduardo',
      'Zeca',
    ]);
  });
});

describe('foldName', () => {
  it('matches the grouping key used by the summary', () => {
    expect(foldName('  Kênia   SILVA (bispo) ')).toBe('kenia silva');
  });
});

describe('weeksBetween', () => {
  it('counts whole weeks between two calendar dates', () => {
    expect(weeksBetween('2026-09-27', '2026-09-27')).toBe(0);
    expect(weeksBetween('2026-09-21', '2026-09-27')).toBe(0);
    expect(weeksBetween('2026-09-20', '2026-09-27')).toBe(1);
    expect(weeksBetween('2026-03-01', '2026-09-27')).toBe(30);
  });
});
