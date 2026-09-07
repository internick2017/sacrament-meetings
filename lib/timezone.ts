// Converts a naive local date/time (the 'YYYY-MM-DDTHH:mm' string a
// datetime-local input sends) into the ISO instant that represents that wall
// clock time in a given IANA time zone.
//
// This is the write-side counterpart to toDatetimeLocalValue in the edit
// page: that function renders a stored instant as local wall time for
// display, this one turns local wall time back into an instant for storage.
// Without it, a naive string handed straight to a `timestamptz` column would
// be interpreted in the database session's timezone (UTC on this project's
// host), not the congregation's — silently shifting every activity by the
// unit's UTC offset.
//
// Kept as a small, pure, exported function (no I/O) specifically so the
// round trip can be tested without a database.
// A day, in milliseconds. Used to sample the zone's offset safely away from
// any DST transition that might fall on the target date itself.
const DAY_MS = 24 * 60 * 60 * 1000;

export function zonedLocalToInstant(local: string, timeZone: string): string {
  const [datePart, timePart] = local.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // Treat the wall-clock numbers as if they were already UTC. This is not
  // the answer (it ignores the zone entirely) but it is a stable reference
  // point: a real DST transition never moves the clock by more than a few
  // hours, so it can never span a full calendar day.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Sample the zone's offset a full day before and a full day after the
  // guess. Those two instants cannot themselves be inside whatever
  // transition (if any) falls on the target date, so offsetBefore and
  // offsetAfter are trustworthy readings of "the offset in effect just
  // before this date's transition" and "...just after" it.
  const offsetBefore = offsetAt(utcGuess - DAY_MS, timeZone);
  const offsetAfter = offsetAt(utcGuess + DAY_MS, timeZone);

  const candidateBefore = utcGuess - offsetBefore;
  const candidateAfter = utcGuess - offsetAfter;

  if (offsetBefore === offsetAfter) {
    // No transition on this calendar date in this zone: both readings agree,
    // and (since a transition can't span a whole day) that shared offset is
    // exactly the offset in effect at the requested local time too.
    return new Date(candidateBefore).toISOString();
  }

  // There IS a transition on this date. Check whether resolving with each
  // candidate offset actually reproduces that same offset at the resulting
  // instant — i.e. whether the candidate is self-consistent.
  const consistentBefore = offsetAt(candidateBefore, timeZone) === offsetBefore;
  const consistentAfter = offsetAt(candidateAfter, timeZone) === offsetAfter;

  if (consistentBefore && consistentAfter) {
    // FALL-BACK OVERLAP: the local time occurs twice (once under each
    // offset), both resolutions are valid instants that display back as the
    // requested wall time. Convention: pick the earlier occurrence (the
    // first time the clock reads this wall time that day).
    return new Date(Math.min(candidateBefore, candidateAfter)).toISOString();
  }

  if (consistentAfter && !consistentBefore) {
    return new Date(candidateAfter).toISOString();
  }

  if (consistentBefore && !consistentAfter) {
    return new Date(candidateBefore).toISOString();
  }

  // SPRING-FORWARD GAP: neither candidate is self-consistent, because this
  // local time was skipped entirely (e.g. 02:30 on a "02:00 -> 03:00" jump)
  // and does not exist. Convention: resolve it as if the wall clock kept
  // advancing through the skipped hour at the pre-transition rate, which is
  // equivalent to applying the pre-transition offset directly to the
  // unmodified wall-clock numbers (candidateBefore) — e.g. 02:30 becomes
  // 03:30 in the post-transition zone, the same instant a leader would land
  // on by typing 03:30 directly.
  return new Date(candidateBefore).toISOString();
}

// What UTC offset (in ms, defined so that `instant - offset` turns a
// UTC-instant reading of the zone's wall clock at `instant` back into
// `instant` itself) is in effect in `timeZone` at a given UTC instant.
function offsetAt(utcMs: number, timeZone: string): number {
  return wallTimeMsInZone(utcMs, timeZone) - utcMs;
}

// What wall-clock time (expressed as a UTC millisecond value, i.e. ignoring
// the zone) a given UTC instant displays as in `timeZone`.
function wallTimeMsInZone(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value ?? 0);
  // Intl can format midnight as hour "24"; normalize it back to 0.
  const hour = get('hour') % 24;

  return Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'), get('second'));
}
