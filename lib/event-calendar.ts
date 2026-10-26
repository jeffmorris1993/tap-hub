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

type EffectiveRecurrence = {
  kind: "none" | "daily" | "weekly" | "monthly" | "monthly_weekday";
  interval: number;
  bydays: number[] | null;
};

/**
 * Normalizes an event's recurrence onto the v2 shape: legacy `biweekly`
 * becomes weekly/interval-2, legacy `weekdays` becomes weekly Mon–Fri, the
 * legacy single `recurrence_byday` feeds `bydays` when the array is unset.
 */
export function effectiveRecurrence(event: RecurringEventFields): EffectiveRecurrence {
  const interval = Math.max(1, event.recurrence_interval ?? 1);
  const bydays = event.recurrence_bydays?.length
    ? [...new Set(event.recurrence_bydays)].sort((a, b) => a - b)
    : event.recurrence_byday != null
      ? [event.recurrence_byday]
      : null;
  switch (event.recurrence_kind) {
    case "biweekly":
      return { kind: "weekly", interval: Math.max(2, interval), bydays };
    case "weekdays":
      return { kind: "weekly", interval, bydays: bydays ?? [1, 2, 3, 4, 5] };
    case "daily":
    case "weekly":
    case "monthly":
    case "monthly_weekday":
      return { kind: event.recurrence_kind, interval, bydays };
    default:
      return { kind: "none", interval: 1, bydays: null };
  }
}

// Backstop for unbounded series scans (a daily event running for decades).
const MAX_SERIES_SCAN = 20000;

/** Yields the series' occurrence days (epoch-day numbers) in order, unbounded. */
function* seriesDays(eff: EffectiveRecurrence, startDay: number): Generator<number> {
  if (eff.kind === "daily") {
    for (let d = startDay; ; d += eff.interval) yield d;
  } else if (eff.kind === "weekly") {
    const bydays = eff.bydays?.length ? eff.bydays : [dayOfWeek(startDay)];
    // Weeks are Sunday-anchored; the phase is pinned to the start date's week.
    const anchor = startDay - dayOfWeek(startDay);
    for (let week = anchor; ; week += 7 * eff.interval) {
      for (const dow of bydays) {
        const day = week + dow;
        if (day >= startDay) yield day;
      }
    }
  } else if (eff.kind === "monthly") {
    const w = dayToWall(startDay);
    let year = w.y;
    let month = w.mo;
    for (;;) {
      const ms = Date.UTC(year, month - 1, w.d);
      // Skips invalid dates (Feb 30 → Mar 2 would change the month).
      if (new Date(ms).getUTCMonth() === month - 1) yield Math.round(ms / DAY_MS);
      month += eff.interval;
      while (month > 12) {
        month -= 12;
        year += 1;
      }
    }
  } else if (eff.kind === "monthly_weekday") {
    const w = dayToWall(startDay);
    const wantDow = dayOfWeek(startDay);
    const nth = Math.floor((w.d - 1) / 7); // 0-based week-of-month
    let year = w.y;
    let month = w.mo;
    for (;;) {
      const firstDow = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
      const dom = 1 + ((wantDow - firstDow + 7) % 7) + nth * 7;
      const ms = Date.UTC(year, month - 1, dom);
      // A 5th weekday can overflow into the next month — skip those.
      if (new Date(ms).getUTCMonth() === month - 1) {
        const day = Math.round(ms / DAY_MS);
        if (day >= startDay) yield day;
      }
      month += eff.interval;
      while (month > 12) {
        month -= 12;
        year += 1;
      }
    }
  }
}

/**
 * The next occurrence starting at or after `now` (Detroit semantics), or
 * null when the event has none left — a one-off in the past, or a recurrence
 * that ended (recurrence_until passed, or recurrence_count exhausted).
 */
export function nextOccurrence(event: RecurringEventFields, now: Date = new Date()): Date | null {
  const start = new Date(event.starts_at);
  if (isNaN(start.getTime())) return null;
  const eff = effectiveRecurrence(event);
  if (eff.kind === "none") {
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

  let index = 0; // occurrences before the one under consideration
  for (const day of seriesDays(eff, startDay)) {
    if (event.recurrence_count != null && index >= event.recurrence_count) return null;
    if (event.recurrence_until && wallDateIso(dayToWall(day)) > event.recurrence_until) return null;
    if (day >= base) return wallToInstant(dayToWall(day), w.hh, w.mm);
    index += 1;
    if (index >= MAX_SERIES_SCAN) return null;
  }
  return null;
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
  if (event.recurrence_kind === "none") {
    // A multi-day block (ends_at on a later day) stays live until it's over —
    // nextOccurrence alone would drop it the day after it starts. Over means
    // the whole block finished before today began.
    const s = new Date(event.starts_at).getTime();
    const e = event.ends_at ? new Date(event.ends_at).getTime() : NaN;
    const last = Math.max(s, isNaN(e) ? s : e);
    return last < new Date(midnight).getTime();
  }
  const probe = new Date(new Date(midnight).getTime() - 60000);
  return nextOccurrence(event, probe) === null;
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

/** Start/end instants for the calendar entry. Defaults to 1 hour when ends_at
 *  is unset (a full day for all-day events). */
export function calendarTimes(event: RecurringEventFields, opts: CalendarLinkOptions = {}): { start: Date; end: Date } {
  const start = opts.occurrence ?? occurrenceStart(event, opts.now);
  const s = new Date(event.starts_at).getTime();
  const e = event.ends_at ? new Date(event.ends_at).getTime() : NaN;
  const durationMs = e > s ? e - s : event.all_day ? DAY_MS - 60000 : 3600000;
  return { start, end: new Date(start.getTime() + durationMs) };
}

/** RRULE body (no "RRULE:" prefix) for recurring events, else null. */
export function buildRrule(event: RecurringEventFields, dtstart: Date): string | null {
  const eff = effectiveRecurrence(event);
  if (eff.kind === "none") return null;
  const w = detroitWall(dtstart);
  const startByday = ICAL_DAYS[dayOfWeek(dayNumber(w))];
  let rule: string;
  switch (eff.kind) {
    case "daily":
      rule = "FREQ=DAILY";
      break;
    case "weekly": {
      const days = (eff.bydays?.length ? eff.bydays : [dayOfWeek(dayNumber(w))])
        .map((d) => ICAL_DAYS[d])
        .join(",");
      rule = `FREQ=WEEKLY;BYDAY=${days}`;
      break;
    }
    case "monthly":
      rule = `FREQ=MONTHLY;BYMONTHDAY=${w.d}`;
      break;
    case "monthly_weekday":
      rule = `FREQ=MONTHLY;BYDAY=${Math.floor((w.d - 1) / 7) + 1}${startByday}`;
      break;
  }
  if (eff.interval > 1) rule += `;INTERVAL=${eff.interval}`;
  if (event.recurrence_until) {
    // recurrence_until is the inclusive last day (Detroit).
    const untilIso = localToUtcIso(`${event.recurrence_until}T23:59:59`);
    if (untilIso) rule += `;UNTIL=${icsUtcStamp(new Date(untilIso))}`;
  } else if (event.recurrence_count != null) {
    rule += `;COUNT=${event.recurrence_count}`;
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
    "PRODID:-//NT Gateway//Events//EN",
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
