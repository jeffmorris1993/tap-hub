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

export function formatWhenText(start: Date, endsAtIso: string | null): string {
  const startDate = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!endsAtIso) return `${startDate} · ${startTime}`;
  const end = new Date(endsAtIso);
  const sameDay = start.toDateString() === end.toDateString();
  if (sameDay) {
    const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
    return `${startDate} · ${startTime}–${endTime}`;
  }
  const endDate = end.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  const endTime = end.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const startShort = start.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${startShort}–${endDate} · ${startTime}–${endTime}`;
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
  const chip = formatEventDateChip(next);
  return {
    ...row,
    month: chip.month,
    day: chip.day,
    whenText: formatWhenText(next, row.ends_at),
    recurrenceLabel: recurrenceLabel(row.recurrence_kind),
    hue: hueFromSlug(row.slug),
    nextOccurrenceIso: next.toISOString(),
  };
}

/** Sort display events by their next occurrence date, ascending. */
export function sortByNextOccurrence(events: DisplayEvent[]): DisplayEvent[] {
  return [...events].sort((a, b) => a.nextOccurrenceIso.localeCompare(b.nextOccurrenceIso));
}
