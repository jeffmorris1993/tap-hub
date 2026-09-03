import { CHURCH_TZ, localToUtcIso } from "./tz";
import type { RecurringEventFields } from "./events-occurrence";

/**
 * "Add to calendar" link + ICS generation.
 *
 * All occurrence math here runs in Detroit wall-clock space (via Intl),
 * deliberately NOT reusing nextOccurrence() from events-occurrence.ts —
 * that helper interprets timestamps in the runtime's local timezone,
 * which is UTC on Vercel and the visitor's own zone in the browser.
 * Calendar entries need the exact instant, so we resolve the wall clock
 * against CHURCH_TZ explicitly and convert back with localToUtcIso().
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

/**
 * The instant the event next occurs (Detroit semantics), used as the
 * calendar entry's start. For recurring events whose window has ended —
 * or any failure — falls back to the original starts_at.
 */
export function occurrenceStart(event: CalendarEventInput, now: Date = new Date()): Date {
  const start = new Date(event.starts_at);
  if (event.recurrence_kind === "none" || isNaN(start.getTime())) return start;

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
      if (month > 11) {
        month = 1;
        year += 1;
      }
    }
  }

  if (candidate === null) return start;
  const candW = dayToWall(candidate);
  if (event.recurrence_until && wallDateIso(candW) > event.recurrence_until) return start;
  return wallToInstant(candW, w.hh, w.mm) ?? start;
}

/** Start/end instants for the calendar entry. Defaults to 1 hour when ends_at is unset. */
export function calendarTimes(event: CalendarEventInput, now?: Date): { start: Date; end: Date } {
  const start = occurrenceStart(event, now);
  const s = new Date(event.starts_at).getTime();
  const e = event.ends_at ? new Date(event.ends_at).getTime() : NaN;
  const durationMs = e > s ? e - s : 3600000;
  return { start, end: new Date(start.getTime() + durationMs) };
}

/** RRULE body (no "RRULE:" prefix) for recurring events, else null. */
export function buildRrule(event: CalendarEventInput, dtstart: Date): string | null {
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

export function googleCalendarUrl(event: CalendarEventInput, now?: Date): string {
  const { start, end } = calendarTimes(event, now);
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
  const rrule = buildRrule(event, start);
  if (rrule) params.set("recur", `RRULE:${rrule}`);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/** Outlook's compose deeplink has no recurrence support — recurring events land as their next instance. */
export function outlookCalendarUrl(event: CalendarEventInput, now?: Date): string {
  const { start, end } = calendarTimes(event, now);
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
export function buildEventIcs(event: CalendarEventInput, pageUrl?: string, now: Date = new Date()): string {
  const { start, end } = calendarTimes(event, now);
  const rrule = buildRrule(event, start);
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
    `UID:event-${event.slug}@nehtemple.org`,
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
