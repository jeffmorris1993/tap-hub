export const CHURCH_TZ = "America/Detroit";

/**
 * Return a Date object whose UTC fields represent the current wall-clock
 * time in the church's timezone. `.getDay()`, `.getHours()`, and
 * `.toISOString().slice(0,10)` on the result give the day-of-week,
 * hour, and ISO date as a person in Detroit would see them.
 *
 * Production servers run in UTC, so without this helper the "today"
 * queries can land on the wrong day of the week from ~8 PM Detroit
 * onward (when UTC has rolled to the next calendar date).
 */
export function detroitNow(): Date {
  const now = new Date();
  // toLocaleString in en-US format produces "M/D/YYYY, H:MM:SS AM/PM"
  // for the requested timezone. Re-parsing that string in the server's
  // local TZ (UTC on Vercel) gives a Date whose fields match the wall
  // clock in Detroit.
  return new Date(now.toLocaleString("en-US", { timeZone: CHURCH_TZ }));
}

/** Detroit-local YYYY-MM-DD. */
export function detroitDateIso(): string {
  const d = detroitNow();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Detroit-local day-of-week (0 = Sunday … 6 = Saturday). */
export function detroitDow(): number {
  return detroitNow().getDay();
}
