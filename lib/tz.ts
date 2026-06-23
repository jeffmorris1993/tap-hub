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

/**
 * Convert a "datetime-local" style string (YYYY-MM-DDTHH:MM) that represents
 * a wall-clock time in the CHURCH'S timezone to the equivalent UTC ISO
 * timestamp. Used everywhere we accept time input from staff (admin form,
 * agent tool calls) so the church always means "Detroit local" even though
 * Vercel runs in UTC.
 *
 *   localToUtcIso("2026-06-15T09:00")  // June: EDT (UTC-4)
 *   // -> "2026-06-15T13:00:00.000Z"
 */
export function localToUtcIso(localValue: string): string | null {
  if (!localValue) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(localValue);
  if (!m) return null;
  const [, y, mo, d, hh, mm, ss] = m;
  const year = +y, month = +mo - 1, day = +d, hour = +hh, minute = +mm, second = ss ? +ss : 0;

  // Build a UTC moment as if the wall clock were UTC, then ask Detroit what
  // wall clock it sees for that moment. The difference is the offset to add.
  const naiveUtcMs = Date.UTC(year, month, day, hour, minute, second);
  const detroitParts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHURCH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(new Date(naiveUtcMs))
    .reduce<Record<string, number>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = parseInt(p.value, 10);
      return acc;
    }, {});
  const detroitMs = Date.UTC(
    detroitParts.year,
    (detroitParts.month ?? 1) - 1,
    detroitParts.day,
    detroitParts.hour,
    detroitParts.minute,
    detroitParts.second,
  );
  const offsetMs = naiveUtcMs - detroitMs;
  return new Date(naiveUtcMs + offsetMs).toISOString();
}

/** Format an ISO timestamp as a HH:MM AM/PM string in Detroit time. */
export function fmtDetroitTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    timeZone: CHURCH_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
}
