import type { EventRow } from "./supabase/queries";
import { nextOccurrence, recurrenceLabel, type RecurringEventFields } from "./events-occurrence";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Stable hue from the slug — gives each event a consistent placeholder hero color. */
export function hueFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function formatEventDateChip(d: Date): { month: string; day: string } {
  return { month: MONTHS[d.getMonth()], day: String(d.getDate()).padStart(2, "0") };
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}
function fmtFullDate(d: Date): string {
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}
function fmtRangeDate(d: Date, withYear = false): string {
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

/**
 * Build the human-readable "when" text for an event card. Strategy depends
 * on the recurrence_kind:
 *
 *   none, single-day   → "Fri Jul 24, 2026 · 9:00 AM[ – 5:00 PM]"
 *   none, multi-day    → "Jul 24 – Jul 29, 2026 · 9:00 AM – 5:00 PM"
 *   daily + until      → "Daily Jul 24 – Jul 29 · 9:00 AM – 5:00 PM"
 *   weekdays + until   → "Mon–Fri Jul 24 – Aug 28 · 9:00 AM – 5:00 PM"
 *   weekly / biweekly  → next occurrence date + time (the recurrenceLabel
 *                        carries the cadence elsewhere on the card)
 *   monthly            → same — next occurrence date + time
 */
export function formatWhenText(row: EventRow, fromDate: Date): string {
  const start = new Date(row.starts_at);
  const end = row.ends_at ? new Date(row.ends_at) : null;
  const startTime = fmtTime(start);
  const endTime = end ? fmtTime(end) : null;
  const timeRange = endTime ? `${startTime} – ${endTime}` : startTime;

  // Recurring with a bounded window — show the range + daily time.
  if (
    (row.recurrence_kind === "daily" || row.recurrence_kind === "weekdays") &&
    row.recurrence_until
  ) {
    const until = new Date(`${row.recurrence_until}T23:59:59`);
    const sameYear = start.getFullYear() === until.getFullYear();
    const startStr = fmtRangeDate(start, !sameYear);
    const untilStr = fmtRangeDate(until, true);
    const prefix = row.recurrence_kind === "weekdays" ? "Mon–Fri" : "Daily";
    return `${prefix} ${startStr} – ${untilStr} · ${timeRange}`;
  }

  // One-off multi-day continuous block (no recurrence, ends on a different day)
  if (row.recurrence_kind === "none" && end && start.toDateString() !== end.toDateString()) {
    const sameYear = start.getFullYear() === end.getFullYear();
    const startStr = fmtRangeDate(start, !sameYear);
    const endStr = fmtRangeDate(end, true);
    return `${startStr} – ${endStr} · ${timeRange}`;
  }

  // Default: show the next occurrence date + time
  const next = nextOccurrence(row as RecurringEventFields, fromDate) ?? start;
  const nextEnd = end ? new Date(next.getTime() + (end.getTime() - start.getTime())) : null;
  const fullDate = fmtFullDate(next);
  if (nextEnd) return `${fullDate} · ${fmtTime(next)} – ${fmtTime(nextEnd)}`;
  return `${fullDate} · ${fmtTime(next)}`;
}

export type DisplayEvent = EventRow & {
  month: string;
  day: string;
  whenText: string;
  recurrenceLabel: string;
  hue: number;
  /** The next occurrence date used to render the card. May equal starts_at for one-offs. */
  nextOccurrenceIso: string;
};

/** Builds the card-ready event using its next occurrence on or after `fromDate`. */
export function toDisplayEvent(row: EventRow, fromDate: Date = new Date()): DisplayEvent {
  const next = nextOccurrence(row as RecurringEventFields, fromDate) ?? new Date(row.starts_at);
  // For bounded recurring or continuous multi-day, pin the chip to day 1.
  // Otherwise show the next occurrence (e.g. next Wednesday for weekly events).
  const useStartForChip =
    (row.recurrence_kind === "daily" ||
      row.recurrence_kind === "weekdays" ||
      (row.recurrence_kind === "none" && row.ends_at)) &&
    new Date(row.starts_at).getTime() <= next.getTime();
  const chipDate = useStartForChip ? new Date(row.starts_at) : next;
  const chip = formatEventDateChip(chipDate);
  return {
    ...row,
    month: chip.month,
    day: chip.day,
    whenText: formatWhenText(row, fromDate),
    recurrenceLabel: recurrenceLabel(row.recurrence_kind),
    hue: hueFromSlug(row.slug),
    nextOccurrenceIso: next.toISOString(),
  };
}

/** Sort display events by their next occurrence date, ascending. */
export function sortByNextOccurrence(events: DisplayEvent[]): DisplayEvent[] {
  return [...events].sort((a, b) => a.nextOccurrenceIso.localeCompare(b.nextOccurrenceIso));
}
