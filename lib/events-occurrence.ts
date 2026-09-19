import { CHURCH_TZ } from "./tz";

/**
 * Recurrence types + labels only. All occurrence *math* lives in
 * lib/event-calendar.ts, which runs in Detroit wall-clock space — the
 * Date-walking helpers that used to live here interpreted timestamps in the
 * runtime's local timezone (UTC on Vercel) and could land on the wrong day.
 *
 * Semantics per kind:
 *   none      — single instance at starts_at
 *   daily     — every day from starts_at through recurrence_until
 *   weekdays  — Mon–Fri only, from starts_at through recurrence_until
 *   weekly    — same day-of-week (recurrence_byday or starts_at's day),
 *               every 7 days
 *   biweekly  — same as weekly with 14-day stride aligned to starts_at
 *   monthly   — same day-of-month as starts_at (skips invalid Feb 30 etc.)
 *   monthly_weekday — same weekday-position as starts_at (a start on the
 *               2nd Friday repeats every 2nd Friday; a 5th weekday is
 *               skipped in months that don't have one)
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
  recurrence_byday: number | null;
  recurrence_until: string | null;
};

const RECURRENCE_LABELS: Record<RecurrenceKind, string> = {
  none: "",
  daily: "Daily",
  weekdays: "Mon–Fri",
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
  monthly_weekday: "Monthly",
};

const NTH_LABELS = ["1st", "2nd", "3rd", "4th", "5th"];

/**
 * Pass startsAt to get a specific label for monthly_weekday events
 * ("Every 2nd Fri" instead of "Monthly").
 */
export function recurrenceLabel(kind: RecurrenceKind, startsAt?: string): string {
  if (kind === "monthly_weekday" && startsAt) {
    const d = new Date(startsAt);
    if (!isNaN(d.getTime())) {
      const dom = Number(d.toLocaleDateString("en-US", { timeZone: CHURCH_TZ, day: "numeric" }));
      const dowName = d.toLocaleDateString("en-US", { timeZone: CHURCH_TZ, weekday: "short" });
      return `Every ${NTH_LABELS[Math.floor((dom - 1) / 7)]} ${dowName}`;
    }
  }
  return RECURRENCE_LABELS[kind] ?? "";
}
