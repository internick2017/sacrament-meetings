import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { zonedLocalToInstant, todayInTimeZone } from './timezone';

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

  // The single-pass version sampled the offset at the naive
  // local-time-as-UTC guess, which can be up to |offset| hours away from the
  // true instant. That is wrong not just inside a DST transition but for
  // EVERY local time within roughly |offset| hours after midnight on a
  // transition day. These cases (found in whole-branch review) pin the
  // two-pass fix plus the explicit gap/overlap conventions documented next
  // to zonedLocalToInstant.
  describe('daylight saving transitions', () => {
    it('resolves an ordinary time shortly after a spring-forward transition correctly (not just inside the gap)', () => {
      // America/Denver springs forward 2026-03-08: 02:00 MST -> 03:00 MDT.
      // 03:30 is a completely normal MDT morning time, not inside the gap,
      // yet the single-pass guess (sampled at 03:30-as-UTC, which falls
      // BEFORE the real transition instant of 09:00Z) used the pre-transition
      // offset (-7h) and produced 10:30Z instead of the correct 09:30Z.
      const instant = zonedLocalToInstant('2026-03-08T03:30', 'America/Denver');
      expect(instant).toBe('2026-03-08T09:30:00.000Z');

      const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'America/Denver',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).formatToParts(new Date(instant));
      const get = (type: string) => parts.find((part) => part.type === type)?.value ?? '00';
      expect(`${get('year')}-${get('month')}-${get('day')}T${get('hour')}:${get('minute')}`).toBe(
        '2026-03-08T03:30'
      );
    });

    it('resolves a local time inside the spring-forward GAP using the documented convention (push forward through the skipped hour)', () => {
      // 02:30 does not exist in America/Denver on 2026-03-08 (clocks jump
      // from 02:00 straight to 03:00). The documented convention resolves a
      // gap as if the wall clock kept advancing at the pre-transition rate,
      // landing on 03:30 MDT, i.e. the same instant as the ordinary 03:30
      // case above.
      const instant = zonedLocalToInstant('2026-03-08T02:30', 'America/Denver');
      expect(instant).toBe('2026-03-08T09:30:00.000Z');
    });

    it('resolves a local time inside the spring-forward GAP for a positive-offset zone the same way', () => {
      // Europe/Madrid springs forward 2026-03-29: 02:00 CET -> 03:00 CEST.
      // 02:30 does not exist; pushed forward through the gap it lands on
      // 03:30 CEST, which is 01:30Z.
      const instant = zonedLocalToInstant('2026-03-29T02:30', 'Europe/Madrid');
      expect(instant).toBe('2026-03-29T01:30:00.000Z');
    });

    it('still converts a stable, no-DST zone correctly (America/Sao_Paulo has had no DST since 2019)', () => {
      const instant = zonedLocalToInstant('2026-03-08T02:30', 'America/Sao_Paulo');
      expect(instant).toBe('2026-03-08T05:30:00.000Z');
    });
  });
});

// todayInTimeZone is tested against a FIXED instant (via fake timers), not
// new Date(), so the test cannot pass by accident just because it happens to
// run at a moment where every zone agrees on the date. This is the exact
// case Finding 1 in the whole-branch review was about: at 21:30 local time
// in Francisco Beltrão on 15 October, UTC has already rolled over to the
// 16th, so a caller that read the date from CURRENT_DATE (UTC) or from
// `new Date().toISOString()` would disagree with a caller that asked for the
// congregation's own calendar date.
describe('todayInTimeZone', () => {
  // 2026-10-16T00:30:00.000Z. In UTC this is already the 16th. In
  // America/Sao_Paulo (UTC-3, no DST) the wall clock reads 2026-10-15
  // 21:30 — sacrament-meeting eve, still the 15th. In Asia/Tokyo (UTC+9,
  // east of UTC) the wall clock reads 2026-10-16 09:30 — also the 16th,
  // but arrived at from the opposite direction, proving the function reads
  // the zone's own wall clock rather than just "is it UTC or not".
  const FIXED_INSTANT = '2026-10-16T00:30:00.000Z';

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(FIXED_INSTANT));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the previous local calendar day in a UTC-3 zone late on a Brazilian evening, even though UTC has already rolled over', () => {
    expect(todayInTimeZone('America/Sao_Paulo')).toBe('2026-10-15');
  });

  it('returns the UTC calendar day in the UTC zone itself', () => {
    expect(todayInTimeZone('UTC')).toBe('2026-10-16');
  });

  it('returns the local calendar day in a zone east of UTC', () => {
    expect(todayInTimeZone('Asia/Tokyo')).toBe('2026-10-16');
  });
});
