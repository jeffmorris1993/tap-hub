// Pure check-in/attendance domain math, importable from server and client.
// All "now" comparisons use Detroit wall-clock fields (via detroitNow()) and
// Detroit-local minutes since midnight — never UTC conversion, so the window
// logic is DST-safe (same convention as schedule_today).

import { detroitNow } from "./tz";

export type AttendeeType = "member" | "regular" | "first" | "returning";

export const ATTENDEE_TYPE_LABEL: Record<AttendeeType, string> = {
  member: "Member",
  regular: "Regular Attendee",
  first: "First-Time Guest",
  returning: "Returning Guest",
};

export type PreferredContact = "text" | "call" | "email";

export type FollowUpStatus = "needs" | "contacted" | "resolved" | "dismissed";

export const FOLLOW_UP_LABEL: Record<FollowUpStatus, string> = {
  needs: "Needs Follow-Up",
  contacted: "Contacted",
  resolved: "Resolved",
  dismissed: "Dismissed",
};

export type CheckinServiceRow = {
  id: string;
  name: string;
  kind: "recurring" | "oneoff";
  day_of_week: number | null;
  service_date: string | null;
  service_minutes: number;
  opens_minutes: number;
  closes_minutes: number;
  enabled: boolean;
  created_at: string;
};

export type OccurrenceOverride = {
  service_id: string;
  occurrence_date: string;
  did_not_occur: boolean;
};

export type Occurrence = {
  serviceId: string;
  serviceName: string;
  date: string; // Detroit YYYY-MM-DD
  serviceMinutes: number;
  status: "upcoming" | "held" | "skipped";
};

export function minutesToLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m < 10 ? "0" + m : m} ${ampm}`;
}

function pad2(n: number): string {
  return n < 10 ? "0" + n : String(n);
}

function dateToIso(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/** Day-of-week (0 = Sunday) of a YYYY-MM-DD, independent of runtime TZ. */
export function dowOfIso(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return dateToIso(date);
}

/** Friendly "Sunday, Oct 25" for a Detroit calendar date. */
export function fmtDateIso(iso: string, opts?: { weekday?: boolean }): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: opts?.weekday === false ? undefined : "short",
    month: "short",
    day: "numeric",
  });
}

export const DOW_LABEL = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

function isSkipped(
  overrides: OccurrenceOverride[],
  serviceId: string,
  dateIso: string,
): boolean {
  return overrides.some(
    (o) => o.service_id === serviceId && o.occurrence_date === dateIso && o.did_not_occur,
  );
}

/** Whether a service has an occurrence on the given Detroit date. */
function occursOn(service: CheckinServiceRow, dateIso: string, dow: number): boolean {
  if (!service.enabled) return false;
  if (service.kind === "oneoff") return service.service_date === dateIso;
  // Recurring services don't generate occurrences before they were created,
  // so a freshly added service never shows phantom "missed" history.
  if (service.created_at && service.created_at.slice(0, 10) > dateIso) return false;
  return service.day_of_week === dow;
}

/**
 * The service whose check-in window is open right now, or null. If two
 * windows overlap, the one whose service time is soonest wins.
 */
export function openServiceNow(
  services: CheckinServiceRow[],
  overrides: OccurrenceOverride[],
  now: Date = detroitNow(),
): { service: CheckinServiceRow; date: string } | null {
  const dateIso = dateToIso(now);
  const minutes = now.getHours() * 60 + now.getMinutes();
  const open = services
    .filter(
      (s) =>
        occursOn(s, dateIso, now.getDay()) &&
        minutes >= s.opens_minutes &&
        minutes < s.closes_minutes &&
        !isSkipped(overrides, s.id, dateIso),
    )
    .sort((a, b) => a.service_minutes - b.service_minutes);
  return open[0] ? { service: open[0], date: dateIso } : null;
}

/** The next time check-in opens within the coming two weeks, or null. */
export function nextOpening(
  services: CheckinServiceRow[],
  overrides: OccurrenceOverride[],
  now: Date = detroitNow(),
): { service: CheckinServiceRow; date: string } | null {
  const todayIso = dateToIso(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  for (let i = 0; i <= 14; i++) {
    const dateIso = addDaysIso(todayIso, i);
    const dow = dowOfIso(dateIso);
    const candidates = services
      .filter(
        (s) =>
          occursOn(s, dateIso, dow) &&
          !isSkipped(overrides, s.id, dateIso) &&
          (i > 0 || s.opens_minutes > nowMinutes),
      )
      .sort((a, b) => a.opens_minutes - b.opens_minutes);
    if (candidates[0]) return { service: candidates[0], date: dateIso };
  }
  return null;
}

/**
 * Every occurrence between fromIso and toIso inclusive. `todayIso` decides
 * upcoming vs held; overrides mark skipped ("did not occur").
 */
export function listOccurrences(
  services: CheckinServiceRow[],
  overrides: OccurrenceOverride[],
  fromIso: string,
  toIso: string,
  todayIso: string,
): Occurrence[] {
  const out: Occurrence[] = [];
  for (let d = fromIso; d <= toIso; d = addDaysIso(d, 1)) {
    const dow = dowOfIso(d);
    for (const s of services) {
      if (!occursOn(s, d, dow)) continue;
      const status: Occurrence["status"] = isSkipped(overrides, s.id, d)
        ? "skipped"
        : d > todayIso
          ? "upcoming"
          : "held";
      out.push({
        serviceId: s.id,
        serviceName: s.name,
        date: d,
        serviceMinutes: s.service_minutes,
        status,
      });
    }
  }
  return out;
}

/**
 * Held (past, not skipped) Sunday dates across all enabled recurring Sunday
 * services, sorted ascending and deduped.
 */
export function heldSundayDates(
  services: CheckinServiceRow[],
  overrides: OccurrenceOverride[],
  fromIso: string,
  todayIso: string,
): string[] {
  const sundayServices = services.filter(
    (s) => s.kind === "recurring" && s.day_of_week === 0,
  );
  const dates = new Set<string>();
  for (const occ of listOccurrences(sundayServices, overrides, fromIso, todayIso, todayIso)) {
    if (occ.status === "held") dates.add(occ.date);
  }
  return [...dates].sort();
}

/**
 * Consecutive held Sundays missed, counting back from the most recent held
 * Sunday. Only Sundays on/after the attendee's first check-in count.
 */
export function consecutiveMissStreak(
  heldSundaysAsc: string[],
  attendedDates: Set<string>,
  firstCheckinDate: string,
): { streak: number; latestMiss: string | null } {
  let streak = 0;
  let latestMiss: string | null = null;
  for (let i = heldSundaysAsc.length - 1; i >= 0; i--) {
    const sunday = heldSundaysAsc[i];
    if (sunday < firstCheckinDate) break;
    if (attendedDates.has(sunday)) break;
    streak++;
    if (!latestMiss) latestMiss = sunday;
  }
  return { streak, latestMiss };
}

/** Stable key for an occurrence in selects and URLs. */
export function occurrenceKey(serviceId: string, dateIso: string): string {
  return `${serviceId}:${dateIso}`;
}

export function parseOccurrenceKey(key: string): { serviceId: string; date: string } | null {
  const idx = key.lastIndexOf(":");
  if (idx < 1) return null;
  const serviceId = key.slice(0, idx);
  const date = key.slice(idx + 1);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return { serviceId, date };
}
