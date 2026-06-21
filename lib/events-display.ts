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
  /** ISO timestamp of the next upcoming occurrence, or null when none remain. */
  nextOccurrenceIso: string | null;
  /** True when there's a future occurrence visitors can still sign up for. */
  signupOpen: boolean;
};

/** Builds the card-ready event using its next occurrence on or after `fromDate`. */
export function toDisplayEvent(row: EventRow, fromDate: Date = new Date()): DisplayEvent {
  const next = nextOccurrence(row as RecurringEventFields, fromDate);
  // Chip date prefers the next upcoming occurrence so visitors see the
  // soonest day they can attend (e.g. next Monday for an ongoing weekdays
  // run that started last week). Falls back to starts_at only when the
  // event has no future occurrence — past one-offs, finished recurrences,
  // or multi-day continuous blocks already in progress.
  const chipDate = next ?? new Date(row.starts_at);
  const chip = formatEventDateChip(chipDate);
  return {
    ...row,
    month: chip.month,
    day: chip.day,
    whenText: formatWhenText(row, fromDate),
    recurrenceLabel: recurrenceLabel(row.recurrence_kind),
    hue: hueFromSlug(row.slug),
    nextOccurrenceIso: next ? next.toISOString() : null,
    signupOpen: next !== null,
  };
}

/** Sort display events by their next occurrence date, ascending. Events with
 *  no upcoming occurrence sort to the bottom (least relevant). */
export function sortByNextOccurrence(events: DisplayEvent[]): DisplayEvent[] {
  return [...events].sort((a, b) => {
    if (a.nextOccurrenceIso && b.nextOccurrenceIso) {
      return a.nextOccurrenceIso.localeCompare(b.nextOccurrenceIso);
    }
    if (a.nextOccurrenceIso) return -1;
    if (b.nextOccurrenceIso) return 1;
    return 0;
  });
}
