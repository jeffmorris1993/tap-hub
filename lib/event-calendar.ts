import { CHURCH_TZ, localToUtcIso } from "./tz";
import type { RecurringEventFields } from "./events-occurrence";

/**
 * The recurrence engine + "add to calendar" link/ICS generation.
 *
 * All occurrence math runs in Detroit wall-clock space (via Intl): a naive
 * `new Date()` walk interprets timestamps in the runtime's local timezone,
 * which is UTC on Vercel and the visitor's own zone in the browser, so the
 * same series can land on different days depending on where the code runs.
 * Everything that needs an occurrence — the events list, per-date signups,
 * calendar entries — resolves the wall clock against CHURCH_TZ explicitly
 * and converts back with localToUtcIso().
 */

export type CalendarEventInput = RecurringEventFields & {
  slug: string;
  title: string;
  description_long: string;
  location: string;
};

type WallDate = { y: number; mo: number; d: number };
type Wall = WallDate & { hh: number; mm: number };

const DAY_MS = 86400000;
const ICAL_DAYS = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Detroit wall-clock fields for a UTC instant. */
function detroitWall(instant: Date): Wall {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CHURCH_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  })
    .formatToParts(instant)
    .reduce<Record<string, number>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = parseInt(p.value, 10);
      return acc;
    }, {});
  return { y: parts.year, mo: parts.month, d: parts.day, hh: parts.hour, mm: parts.minute };
}

// Timezone-free calendar-day arithmetic: a day is its UTC epoch-day index.
function dayNumber(w: WallDate): number {
  return Math.round(Date.UTC(w.y, w.mo - 1, w.d) / DAY_MS);
}

function dayToWall(day: number): WallDate {
  const d = new Date(day * DAY_MS);
  return { y: d.getUTCFullYear(), mo: d.getUTCMonth() + 1, d: d.getUTCDate() };
}

function dayOfWeek(day: number): number {
  return new Date(day * DAY_MS).getUTCDay();
}

function wallDateIso(w: WallDate): string {
  return `${w.y}-${pad(w.mo)}-${pad(w.d)}`;
}

/** Detroit wall date+time → UTC instant. */
function wallToInstant(date: WallDate, hh: number, mm: number): Date | null {
  const iso = localToUtcIso(`${wallDateIso(date)}T${pad(hh)}:${pad(mm)}`);
  return iso ? new Date(iso) : null;
}

/** Detroit-local YYYY-MM-DD for an instant. */
export function detroitDayIso(instant: Date): string {
  return wallDateIso(detroitWall(instant));
}

/**
 * The next occurrence starting at or after `now` (Detroit semantics), or
 * null when the event has none left — a one-off in the past, or a recurrence
 * window that has ended.
 */
export function nextOccurrence(event: RecurringEventFields, now: Date = new Date()): Date | null {
  const start = new Date(event.starts_at);
  if (isNaN(start.getTime())) return null;
  if (event.recurrence_kind === "none") {
    return start.getTime() >= now.getTime() ? start : null;
  }

  const w = detroitWall(start);
  const nowW = detroitWall(now);
  const startDay = dayNumber(w);
  const todayDay = dayNumber(nowW);
  let base = Math.max(startDay, todayDay);
  // Today's instance has already begun — look from tomorrow onward.
  if (base === todayDay && (w.hh < nowW.hh || (w.hh === nowW.hh && w.mm <= nowW.mm))) {
    base += 1;
  }

  let candidate: number | null = null;

  if (event.recurrence_kind === "daily") {
    candidate = base;
  } else if (event.recurrence_kind === "weekdays") {
    candidate = base;
    while (dayOfWeek(candidate) === 0 || dayOfWeek(candidate) === 6) candidate += 1;
  } else if (event.recurrence_kind === "weekly" || event.recurrence_kind === "biweekly") {
    const wantDow = event.recurrence_byday ?? dayOfWeek(startDay);
    candidate = base + ((wantDow - dayOfWeek(base) + 7) % 7);
    if (event.recurrence_kind === "biweekly") {
      const phase = (((candidate - startDay) % 14) + 14) % 14;
      if (phase !== 0) candidate += 14 - phase;
    }
  } else if (event.recurrence_kind === "monthly") {
    const wantDom = w.d;
    const baseW = dayToWall(base);
    let year = baseW.y;
    let month = baseW.mo;
    for (let i = 0; i < 24; i++) {
      const ms = Date.UTC(year, month - 1, wantDom);
      const valid = new Date(ms).getUTCMonth() === month - 1; // weeds out Feb 30 → Mar 2
      const day = Math.round(ms / DAY_MS);
      if (valid && day >= base) {
        candidate = day;
        break;
      }
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  } else if (event.recurrence_kind === "monthly_weekday") {
    const wantDow = dayOfWeek(startDay);
    const nth = Math.floor((w.d - 1) / 7); // 0-based week-of-month
    const baseW = dayToWall(base);
    let year = baseW.y;
    let month = baseW.mo;
    for (let i = 0; i < 24; i++) {
      const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
      const dom = 1 + ((wantDow - firstDow + 7) % 7) + nth * 7;
      const ms = Date.UTC(year, month - 1, dom);
      const valid = new Date(ms).getUTCMonth() === month - 1; // a 5th weekday can overflow
      const day = Math.round(ms / DAY_MS);
      if (valid && day >= base) {
        candidate = day;
        break;
      }
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
  }

  if (candidate === null) return null;
  const candW = dayToWall(candidate);
  if (event.recurrence_until && wallDateIso(candW) > event.recurrence_until) return null;
  return wallToInstant(candW, w.hh, w.mm);
}

/**
 * The instant the event next occurs (Detroit semantics), used as the
 * calendar entry's start. For recurring events whose window has ended —
 * or any failure — falls back to the original starts_at.
 */
export function occurrenceStart(event: RecurringEventFields, now: Date = new Date()): Date {
  return nextOccurrence(event, now) ?? new Date(event.starts_at);
}

/**
 * The exact start instant of the occurrence on a specific Detroit calendar
 * date (YYYY-MM-DD), or null when the series has no occurrence that day.
 * This is the validator behind ?date= links and per-date signups.
 */
export function occurrenceOnDate(event: RecurringEventFields, dateIso: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return null;
  const midnight = localToUtcIso(`${dateIso}T00:00`);
  if (!midnight) return null;
  // Probe from just before the day starts so an occurrence at any time of
  // day — including midnight — counts as "on" the date.
  const probe = new Date(new Date(midnight).getTime() - 60000);
  const occ = nextOccurrence(event, probe);
  if (!occ || detroitDayIso(occ) !== dateIso) return null;
  return occ;
}

/**
 * True when the event has no occurrence today (Detroit) or later. Anchoring
 * at the start of `todayIso` keeps an event that finished earlier today
 * visible until midnight.
 */
export function isSeriesOver(event: RecurringEventFields, todayIso: string): boolean {
  const midnight = localToUtcIso(`${todayIso}T00:00`);
  if (!midnight) return false;
  return nextOccurrence(event, new Date(new Date(midnight).getTime() - 60000)) === null;
}

/**
 * The next `count` occurrence starts (a single item for one-off events, or
 * fewer than `count` when the series ends first).
 */
export function upcomingOccurrences(event: RecurringEventFields, count: number, now: Date = new Date()): Date[] {
  const out: Date[] = [];
  let cursor = now;
  for (let i = 0; i < count; i++) {
    const start = nextOccurrence(event, cursor);
    if (!start) break;
    out.push(start);
    if (event.recurrence_kind === "none") break;
    cursor = new Date(start.getTime() + 60000);
  }
  return out;
}

/**
 * How a calendar entry is built:
 *   mode "series" (default) — anchored at the next occurrence, with the
 *     recurrence rule attached so the whole series lands in the calendar.
 *   mode "occurrence" — a single entry for `occurrence` only; no recurrence
 *     rule, and a per-date UID so it never overwrites the series entry.
 */
export type CalendarLinkOptions = {
  now?: Date;
  mode?: "series" | "occurrence";
  /** The specific occurrence start; required for mode "occurrence". */
  occurrence?: Date | null;
};

/** Start/end instants for the calendar entry. Defaults to 1 hour when ends_at is unset. */
export function calendarTimes(event: RecurringEventFields, opts: CalendarLinkOptions = {}): { start: Date; end: Date } {
  const start = opts.occurrence ?? occurrenceStart(event, opts.now);
  const s = new Date(event.starts_at).getTime();
  const e = event.ends_at ? new Date(event.ends_at).getTime() : NaN;
  const durationMs = e > s ? e - s : 3600000;
  return { start, end: new Date(start.getTime() + durationMs) };
}

/** RRULE body (no "RRULE:" prefix) for recurring events, else null. */
export function buildRrule(event: RecurringEventFields, dtstart: Date): string | null {
  if (event.recurrence_kind === "none") return null;
  const w = detroitWall(dtstart);
  const byday = ICAL_DAYS[dayOfWeek(dayNumber(w))];
  let rule: string;
  switch (event.recurrence_kind) {
    case "daily":
      rule = "FREQ=DAILY";
      break;
    case "weekdays":
      rule = "FREQ=WEEKLY;BYDAY=MO,TU,WE,TH,FR";
      break;
    case "weekly":
      rule = `FREQ=WEEKLY;BYDAY=${byday}`;
      break;
    case "biweekly":
      rule = `FREQ=WEEKLY;INTERVAL=2;BYDAY=${byday}`;
      break;
    case "monthly":
      rule = `FREQ=MONTHLY;BYMONTHDAY=${w.d}`;
      break;
    case "monthly_weekday":
      rule = `FREQ=MONTHLY;BYDAY=${Math.floor((w.d - 1) / 7) + 1}${byday}`;
      break;
    default:
      return null;
  }
  if (event.recurrence_until) {
    // recurrence_until is the inclusive last day (Detroit).
    const untilIso = localToUtcIso(`${event.recurrence_until}T23:59:59`);
    if (untilIso) rule += `;UNTIL=${icsUtcStamp(new Date(untilIso))}`;
  }
  return rule;
}

function icsUtcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
}

function wallStamp(w: Wall): string {
  return `${w.y}${pad(w.mo)}${pad(w.d)}T${pad(w.hh)}${pad(w.mm)}00`;
}

function truncate(text: string, max: number): string {
  return text.length > max ? text.slice(0, max - 1) + "…" : text;
}

export function googleCalendarUrl(event: CalendarEventInput, opts: CalendarLinkOptions = {}): string {
  const { start, end } = calendarTimes(event, opts);
  // Wall-clock dates + ctz (not UTC "Z" times) so recurring entries stay
  // pinned to Detroit wall time across DST changes.
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${wallStamp(detroitWall(start))}/${wallStamp(detroitWall(end))}`,
    ctz: CHURCH_TZ,
    details: truncate(event.description_long, 800),
    location: event.location,
  });
  const rrule = opts.mode === "occurrence" ? null : buildRrule(event, start);
  if (rrule) params.set("recur", `RRULE:${rrule}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook's compose deeplink has no recurrence support — recurring events land as their next instance. */
export function outlookCalendarUrl(event: CalendarEventInput, opts: CalendarLinkOptions = {}): string {
  const { start, end } = calendarTimes(event, opts);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: truncate(event.description_long, 800),
    location: event.location,
  });
  return `https://outlook.live.com/calendar/0/action/compose?${params.toString()}`;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/** RFC 5545 line folding at 74 chars, continuation lines led by a space. */
function foldIcsLine(line: string): string {
  if (line.length <= 74) return line;
  const chunks = [line.slice(0, 74)];
  for (let i = 74; i < line.length; i += 73) {
    chunks.push(" " + line.slice(i, i + 73));
  }
  return chunks.join("\r\n");
}

// US DST rules (2007+) so TZID-anchored times survive strict parsers.
const VTIMEZONE = [
  "BEGIN:VTIMEZONE",
  `TZID:${CHURCH_TZ}`,
  "BEGIN:DAYLIGHT",
  "TZOFFSETFROM:-0500",
  "TZOFFSETTO:-0400",
  "TZNAME:EDT",
  "DTSTART:19700308T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
  "END:DAYLIGHT",
  "BEGIN:STANDARD",
  "TZOFFSETFROM:-0400",
  "TZOFFSETTO:-0500",
  "TZNAME:EST",
  "DTSTART:19701101T020000",
  "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
  "END:STANDARD",
  "END:VTIMEZONE",
];

/** Full .ics file body for the event (Apple Calendar, Outlook desktop, etc.). */
export function buildEventIcs(event: CalendarEventInput, pageUrl?: string, opts: CalendarLinkOptions = {}): string {
  const now = opts.now ?? new Date();
  const { start, end } = calendarTimes(event, opts);
  const single = opts.mode === "occurrence";
  const rrule = single ? null : buildRrule(event, start);
  // A single-date entry gets its own UID so importing it never overwrites
  // a previously imported series entry (calendars dedupe on UID).
  const uid = single
    ? `event-${event.slug}-${detroitDayIso(start)}@nehtemple.org`
    : `event-${event.slug}@nehtemple.org`;
  const description = pageUrl
    ? `${event.description_long}\n\n${pageUrl}`
    : event.description_long;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//TAP Hub//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...VTIMEZONE,
    "BEGIN:VEVENT",
    `UID:${uid}`,
    `DTSTAMP:${icsUtcStamp(now)}`,
    `DTSTART;TZID=${CHURCH_TZ}:${wallStamp(detroitWall(start))}`,
    `DTEND;TZID=${CHURCH_TZ}:${wallStamp(detroitWall(end))}`,
    ...(rrule ? [`RRULE:${rrule}`] : []),
    `SUMMARY:${escapeIcsText(event.title)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    `LOCATION:${escapeIcsText(event.location)}`,
    ...(pageUrl ? [`URL:${pageUrl}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join("\r\n") + "\r\n";
}
