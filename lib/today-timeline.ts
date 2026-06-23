import type { ScheduleRow, RowStatus, RowView } from "./clock";
import type { DisplayEvent } from "./events-display";

/** A row in the unified "Today" timeline — comes from either the standard
 *  schedule_today rhythm or a one-off / recurring event instance today. */
export type TimelineRow = RowView & {
  /** Optional URL: events get a link to /events/[slug]; recurring schedule rows don't. */
  href?: string;
  /** Internal sort key — minutes past midnight for today's instance. */
  sortMinutes: number;
};

function detroitMinutes(date: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Detroit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const h = parseInt(parts.find((p) => p.type === "hour")?.value ?? "0", 10);
  const m = parseInt(parts.find((p) => p.type === "minute")?.value ?? "0", 10);
  return h * 60 + m;
}

function formatTime(mins: number): { time: string; ampm: string } {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { time: `${h}:${m < 10 ? "0" + m : m}`, ampm };
}

function statusFor(startMinutes: number, durationMinutes: number, nowMinutes: number): RowStatus {
  if (nowMinutes < startMinutes) return "soon";
  if (nowMinutes < startMinutes + durationMinutes) return "live";
  return "done";
}

function scheduleRowToTimeline(s: ScheduleRow, nowMinutes: number): TimelineRow {
  const t = formatTime(s.startsAtMinutes);
  return {
    label: s.label,
    where: s.where,
    time: t.time,
    ampm: t.ampm,
    status: statusFor(s.startsAtMinutes, s.durationMinutes, nowMinutes),
    sortMinutes: s.startsAtMinutes,
  };
}

function eventToTimeline(e: DisplayEvent, nowMinutes: number): TimelineRow {
  const occurrence = e.nextOccurrenceIso ? new Date(e.nextOccurrenceIso) : new Date(e.starts_at);
  const startMinutes = detroitMinutes(occurrence);
  // Compute duration from the original starts_at -> ends_at delta so daily/weekday
  // events that repeat get a consistent window. If ends_at isn't set, treat as a
  // single point in time (no live window — flips straight to "done" after start).
  let durationMinutes = 0;
  if (e.ends_at) {
    const start = new Date(e.starts_at);
    const end = new Date(e.ends_at);
    durationMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  }
  const t = formatTime(startMinutes);
  return {
    label: e.title,
    where: e.location,
    time: t.time,
    ampm: t.ampm,
    status: statusFor(startMinutes, durationMinutes, nowMinutes),
    href: `/events/${e.slug}`,
    sortMinutes: startMinutes,
  };
}

/**
 * Merge the standard weekly schedule and today's event instances into a
 * single chronological list with Live/Soon/Done badges. Used by `/today`
 * so visitors see one cohesive "what's happening today" view instead of
 * two parallel sections.
 */
export function buildTodayTimeline(
  schedule: ScheduleRow[],
  todaysEvents: DisplayEvent[],
  now: Date,
): TimelineRow[] {
  const nowMinutes = detroitMinutes(now);
  return [
    ...schedule.map((s) => scheduleRowToTimeline(s, nowMinutes)),
    ...todaysEvents.map((e) => eventToTimeline(e, nowMinutes)),
  ].sort((a, b) => a.sortMinutes - b.sortMinutes);
}
