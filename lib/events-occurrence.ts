export type RecurrenceKind = "none" | "weekly" | "biweekly" | "monthly";

export type RecurringEventFields = {
  starts_at: string;
  ends_at: string | null;
  recurrence_kind: RecurrenceKind;
  recurrence_byday: number | null;
  recurrence_until: string | null;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function isAfterUntil(d: Date, untilIso: string | null): boolean {
  if (!untilIso) return false;
  // recurrence_until is inclusive (the last day the series runs).
  const until = new Date(`${untilIso}T23:59:59`);
  return d.getTime() > until.getTime();
}

/**
 * Return the next datetime at or after `fromDate` that this event occurs.
 * Returns null if the event is finished (one-off in the past, or recurrence
 * window has ended).
 *
 * For weekly/biweekly the day-of-week is taken from `recurrence_byday` if
 * set, else from the original start date.
 *
 * For monthly the day-of-month is derived from the original start date.
 * If a target month doesn't have that day (e.g. Feb 30), the occurrence
 * is skipped — we move to the next month.
 */
export function nextOccurrence(event: RecurringEventFields, fromDate: Date): Date | null {
  const start = new Date(event.starts_at);
  if (isNaN(start.getTime())) return null;

  if (event.recurrence_kind === "none") {
    return start.getTime() >= fromDate.getTime() ? start : null;
  }

  if (isAfterUntil(fromDate, event.recurrence_until)) return null;

  const startMinutes = start.getHours() * 60 + start.getMinutes();
  const wantDow = event.recurrence_byday ?? start.getDay();

  if (event.recurrence_kind === "weekly" || event.recurrence_kind === "biweekly") {
    const stride = event.recurrence_kind === "weekly" ? 7 : 14;
    // Walk forward from the latter of (start date, today) to the next
    // occurrence on the right day-of-week and same biweekly phase.
    const baseDate = start.getTime() > fromDate.getTime() ? start : fromDate;
    const baseDay = startOfDay(baseDate);
    // Compute days until the next target day-of-week.
    const deltaToWantDow = (wantDow - baseDay.getDay() + 7) % 7;
    let candidate = addDays(baseDay, deltaToWantDow);
    if (event.recurrence_kind === "biweekly") {
      // Align candidate to the same 14-day phase as the original start.
      const startDay = startOfDay(start);
      const daysSinceStart = Math.round((candidate.getTime() - startDay.getTime()) / 86400000);
      const phaseOffset = ((daysSinceStart % 14) + 14) % 14;
      if (phaseOffset !== 0) candidate = addDays(candidate, 14 - phaseOffset);
    }
    candidate.setHours(Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
    // If candidate is in the same day as fromDate but earlier in the day,
    // we need to advance one stride forward.
    if (candidate.getTime() < fromDate.getTime()) {
      candidate = addDays(candidate, stride);
    }
    if (isAfterUntil(candidate, event.recurrence_until)) return null;
    return candidate;
  }

  if (event.recurrence_kind === "monthly") {
    const wantDom = start.getDate();
    const from = startOfDay(fromDate);
    // Start search at the later of (event start month, fromDate month).
    let year = Math.max(start.getFullYear(), from.getFullYear());
    let month = year === from.getFullYear() ? Math.max(start.getMonth(), from.getMonth()) : start.getMonth();
    // Try up to 24 months to find a valid occurrence (skips Feb 30, etc.).
    for (let i = 0; i < 24; i++) {
      const candidate = new Date(year, month, wantDom, Math.floor(startMinutes / 60), startMinutes % 60, 0, 0);
      const valid = candidate.getMonth() === month; // weeds out invalid Feb 30 → Mar 2
      if (valid && candidate.getTime() >= fromDate.getTime()) {
        if (isAfterUntil(candidate, event.recurrence_until)) return null;
        return candidate;
      }
      month += 1;
      if (month > 11) {
        month = 0;
        year += 1;
      }
    }
    return null;
  }

  return null;
}

/** Returns true if an event has an occurrence on `dateIso` (YYYY-MM-DD). */
export function hasOccurrenceOnDate(event: RecurringEventFields, dateIso: string): boolean {
  const dayStart = new Date(`${dateIso}T00:00:00`);
  const dayEnd = new Date(`${dateIso}T23:59:59.999`);
  const next = nextOccurrence(event, dayStart);
  if (!next) return false;
  return next.getTime() <= dayEnd.getTime();
}

const RECURRENCE_LABELS: Record<RecurrenceKind, string> = {
  none: "",
  weekly: "Every week",
  biweekly: "Every 2 weeks",
  monthly: "Every month",
};

export function recurrenceLabel(kind: RecurrenceKind): string {
  return RECURRENCE_LABELS[kind] ?? "";
}
