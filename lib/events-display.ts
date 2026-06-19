import type { EventRow } from "./supabase/queries";

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

/** Stable hue from the slug — gives each event a consistent placeholder hero color. */
export function hueFromSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  return h % 360;
}

export function formatEventDateChip(startsAt: string): { month: string; day: string } {
  const d = new Date(startsAt);
  return { month: MONTHS[d.getMonth()], day: String(d.getDate()).padStart(2, "0") };
}

export function formatWhenText(startsAt: string, endsAt: string | null): string {
  const start = new Date(startsAt);
  const startDate = start.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const startTime = start.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  if (!endsAt) return `${startDate} · ${startTime}`;
  const end = new Date(endsAt);
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
  hue: number;
};

export function toDisplayEvent(row: EventRow): DisplayEvent {
  const chip = formatEventDateChip(row.starts_at);
  return {
    ...row,
    month: chip.month,
    day: chip.day,
    whenText: formatWhenText(row.starts_at, row.ends_at),
    hue: hueFromSlug(row.slug),
  };
}
