import { CHURCH_TZ } from "./tz";

/**
 * Recurrence types + labels only. All occurrence *math* lives in
 * lib/event-calendar.ts, which runs in Detroit wall-clock space — the
 * Date-walking helpers that used to live here interpreted timestamps in the
 * runtime's local timezone (UTC on Vercel) and could land on the wrong day.
 *
 * Semantics per kind (v2 — Google-Calendar-like):
 *   none      — single instance at starts_at (possibly a multi-day block
 *               when ends_at falls on a later day)
 *   daily     — every `recurrence_interval` days from starts_at
 *   weekly    — on `recurrence_bydays` (or starts_at's weekday), every
 *               `recurrence_interval` weeks, phase-anchored to the start week
 *   monthly   — same day-of-month as starts_at, every `recurrence_interval`
 *               months (skips invalid Feb 30 etc.)
 *   monthly_weekday — same weekday-position as starts_at (a start on the
 *               2nd Friday repeats every 2nd Friday; a 5th weekday is
 *               skipped in months that don't have one)
 *
 * A series ends at the earlier of `recurrence_until` (inclusive Detroit day)
 * and `recurrence_count` total occurrences; both null = never ends.
 *
 * Legacy kinds still readable (rows predating the v2 migration, old agent
 * drafts): `biweekly` = weekly with interval 2, `weekdays` = weekly Mon–Fri.
 * The form and agent no longer write them.
 */
export type RecurrenceKind =
  | "none"
  | "daily"
  | "weekdays"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "monthly_weekday";

export type RecurringEventFields = {
  starts_at: string;
  ends_at: string | null;
  recurrence_kind: RecurrenceKind;
  /** Legacy single weekday (0=Sun); superseded by recurrence_bydays. */
  recurrence_byday?: number | null;
  /** Repeat every N days/weeks/months (default 1). */
  recurrence_interval?: number | null;
  /** Weekdays for weekly series (0=Sun); null = starts_at's weekday. */
  recurrence_bydays?: number[] | null;
  /** End after N total occurrences; null = no count limit. */
  recurrence_count?: number | null;
  /** Inclusive last day (Detroit, YYYY-MM-DD); null = no date limit. */
  recurrence_until: string | null;
  /** Date-only event: hide times, render as a day/date-range. */
  all_day?: boolean | null;
};

const DOW_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const NTH_LABELS = ["1st", "2nd", "3rd", "4th", "5th"];

function sortedBydays(bydays: number[] | null | undefined): number[] | null {
  if (!bydays?.length) return null;
  return [...new Set(bydays)].sort((a, b) => a - b);
}

function bydayNames(bydays: number[]): string {
  if (bydays.length === 5 && bydays.join(",") === "1,2,3,4,5") return "Mon–Fri";
  return bydays.map((d) => DOW_SHORT[d] ?? "").filter(Boolean).join(", ");
}

/**
 * Human label for the series cadence ("Every 2 weeks on Tue, Thu").
 * Pass startsAt to get a specific label for monthly_weekday events
 * ("Every 2nd Fri" instead of "Monthly"); pass opts to reflect the v2
 * interval/bydays fields.
 */
export function recurrenceLabel(
  kind: RecurrenceKind,
  startsAt?: string,
  opts?: { interval?: number | null; bydays?: number[] | null },
): string {
  const interval = Math.max(1, opts?.interval ?? 1) * (kind === "biweekly" ? 2 : 1);
  const bydays = sortedBydays(kind === "weekdays" ? [1, 2, 3, 4, 5] : opts?.bydays);

  switch (kind) {
    case "none":
      return "";
    case "daily":
      return interval > 1 ? `Every ${interval} days` : "Daily";
    case "weekdays":
    case "weekly":
    case "biweekly": {
      const on = bydays ? ` on ${bydayNames(bydays)}` : "";
      if (bydays && bydayNames(bydays) === "Mon–Fri" && interval === 1) return "Mon–Fri";
      return interval > 1 ? `Every ${interval} weeks${on}` : `Every week${on}`;
    }
    case "monthly":
      return interval > 1 ? `Every ${interval} months` : "Every month";
    case "monthly_weekday": {
      if (startsAt) {
        const d = new Date(startsAt);
        if (!isNaN(d.getTime())) {
          const dom = Number(d.toLocaleDateString("en-US", { timeZone: CHURCH_TZ, day: "numeric" }));
          const dowName = d.toLocaleDateString("en-US", { timeZone: CHURCH_TZ, weekday: "short" });
          const nth = `${NTH_LABELS[Math.floor((dom - 1) / 7)]} ${dowName}`;
          return interval > 1 ? `Every ${nth} · every ${interval} months` : `Every ${nth}`;
        }
      }
      return interval > 1 ? `Every ${interval} months` : "Monthly";
    }
    default:
      return "";
  }
}
