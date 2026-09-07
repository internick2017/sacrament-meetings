import { describe, it, expect } from 'vitest';
import { zonedLocalToInstant } from './timezone';

// America/Sao_Paulo is this project's default unit timezone (see
// EMPTY_UNIT in lib/unit-db.ts) and is UTC-3 with no DST since 2019, so it
// is a stable, non-UTC zone to pin the round trip against.
describe('zonedLocalToInstant', () => {
  it('converts a naive local time in a non-UTC zone to the correct UTC instant', () => {
    // 19:00 in Sao Paulo (UTC-3) is 22:00 UTC, not 16:00 (double-subtracted)
    // and not 19:00 (treated as if it were already UTC).
    const instant = zonedLocalToInstant('2026-10-02T19:00', 'America/Sao_Paulo');
    expect(instant).toBe('2026-10-02T22:00:00.000Z');
  });

  it('round-trips through the same rendering the edit page uses, recovering the original wall time', () => {
    const local = '2026-10-02T19:00';
    const timeZone = 'America/Sao_Paulo';
    const instant = zonedLocalToInstant(local, timeZone);

    // Mirrors toDatetimeLocalValue in app/(admin)/activities/[id]/edit/page.tsx.
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(new Date(instant));
    const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
    const renderedBack = `${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`;

    expect(renderedBack).toBe(local);
  });

  it('produces the correct instant for a positive-offset zone as well', () => {
    // Asia/Tokyo is UTC+9 year-round, so 19:00 local is 10:00 UTC the same day.
    const instant = zonedLocalToInstant('2026-10-02T19:00', 'Asia/Tokyo');
    expect(instant).toBe('2026-10-02T10:00:00.000Z');
  });

  it('handles midnight correctly (no off-by-one from hour 24 normalization)', () => {
    const instant = zonedLocalToInstant('2026-10-02T00:00', 'America/Sao_Paulo');
    expect(instant).toBe('2026-10-02T03:00:00.000Z');
  });
});
