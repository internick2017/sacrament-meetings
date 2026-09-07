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
export function zonedLocalToInstant(local: string, timeZone: string): string {
  const [datePart, timePart] = local.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);

  // First guess: treat the wall-clock numbers as if they were already UTC.
  const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0);

  // Find out what that guess instant reads as when displayed in the target
  // zone. The difference between that reading and the guess is the zone's
  // offset from UTC at (approximately) this moment.
  const offsetMs = wallTimeMsInZone(utcGuess, timeZone) - utcGuess;

  // Subtracting the offset turns "wall clock in the zone" back into the
  // actual UTC instant: e.g. 19:00 in America/Sao_Paulo (UTC-3, offset
  // -180min) guesses 19:00Z, reads as 16:00Z-equivalent wall time (offset
  // -3h), so we subtract -3h (i.e. add 3h) to land on the correct 22:00Z.
  return new Date(utcGuess - offsetMs).toISOString();
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
