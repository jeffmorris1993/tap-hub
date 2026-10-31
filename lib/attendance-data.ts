import "server-only";

import { createHash } from "crypto";
import { supabaseAdmin } from "./supabase/server";
import { occurrenceKey } from "./attendance";
import type {
  AttendeeType,
  CheckinServiceRow,
  FollowUpStatus,
  OccurrenceOverride,
  PreferredContact,
} from "./attendance";

export type AttendeeRow = {
  id: string;
  first_name: string;
  last_name: string;
  attendee_type: AttendeeType;
  phone: string | null;
  email: string | null;
  preferred_contact: PreferredContact | null;
  contact_consent: boolean;
  created_at: string;
};

export type CheckinRow = {
  id: string;
  attendee_id: string;
  service_id: string;
  occurrence_date: string;
  attendee_type: AttendeeType;
  checked_in_at: string;
};

export type FollowUpRow = {
  attendee_id: string;
  status: FollowUpStatus;
  miss_anchor: string | null;
  updated_by: string | null;
  updated_at: string;
};

export type WalkinRow = {
  id: string;
  service_id: string;
  occurrence_date: string;
  created_by: string | null;
  created_at: string;
};

export async function loadServices(): Promise<CheckinServiceRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("checkin_services")
    .select("*")
    .order("kind")
    .order("day_of_week", { ascending: true, nullsFirst: false })
    .order("service_date", { ascending: false, nullsFirst: false });
  if (error) throw new Error(`checkin_services load failed: ${error.message}`);
  return (data ?? []) as CheckinServiceRow[];
}

export async function loadServiceById(id: string): Promise<CheckinServiceRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("checkin_services")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`checkin_service load failed: ${error.message}`);
  return (data ?? null) as CheckinServiceRow | null;
}

/** Every check-in window belonging to an event, newest occurrence first. */
export async function loadServicesForEvent(eventId: string): Promise<CheckinServiceRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("checkin_services")
    .select("*")
    .eq("event_id", eventId)
    .order("service_date", { ascending: false });
  if (error) throw new Error(`event check-in windows load failed: ${error.message}`);
  return (data ?? []) as CheckinServiceRow[];
}

export async function loadOverrides(): Promise<OccurrenceOverride[]> {
  const { data, error } = await supabaseAdmin()
    .from("checkin_occurrence_overrides")
    .select("service_id, occurrence_date, did_not_occur");
  if (error) throw new Error(`occurrence overrides load failed: ${error.message}`);
  return (data ?? []) as OccurrenceOverride[];
}

/**
 * Postgres "relation does not exist". Walk-ins were added after the attendance
 * pages shipped, so a database that hasn't had 20261030000000_event_checkin
 * applied yet reads as "no walk-ins" instead of taking those pages down with
 * it. Any other error still throws.
 */
const UNDEFINED_TABLE = "42P01";

function isMissingWalkinsTable(error: { code?: string } | null): boolean {
  if (error?.code !== UNDEFINED_TABLE) return false;
  console.warn("[attendance] checkin_walkins is missing — run the event_checkin migration");
  return true;
}

/** Anonymous door counts, keyed by `occurrenceKey(serviceId, date)`. */
export async function loadWalkinCounts(): Promise<Map<string, number>> {
  const { data, error } = await supabaseAdmin()
    .from("checkin_walkins")
    .select("service_id, occurrence_date");
  const counts = new Map<string, number>();
  if (error) {
    if (isMissingWalkinsTable(error)) return counts;
    throw new Error(`walk-ins load failed: ${error.message}`);
  }
  for (const row of (data ?? []) as Array<{ service_id: string; occurrence_date: string }>) {
    const key = occurrenceKey(row.service_id, row.occurrence_date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

/** Named check-ins and walk-ins for one occurrence, for the display screen. */
export async function loadOccurrenceCounts(
  serviceId: string,
  occurrenceDate: string,
): Promise<{ checkins: number; walkins: number }> {
  const db = supabaseAdmin();
  const [named, walkins] = await Promise.all([
    db
      .from("checkins")
      .select("*", { count: "exact", head: true })
      .eq("service_id", serviceId)
      .eq("occurrence_date", occurrenceDate),
    db
      .from("checkin_walkins")
      .select("*", { count: "exact", head: true })
      .eq("service_id", serviceId)
      .eq("occurrence_date", occurrenceDate),
  ]);
  if (named.error) throw new Error(`checkin count failed: ${named.error.message}`);
  if (walkins.error && !isMissingWalkinsTable(walkins.error)) {
    throw new Error(`walk-in count failed: ${walkins.error.message}`);
  }
  return { checkins: named.count ?? 0, walkins: walkins.count ?? 0 };
}

export type AttendanceDataset = {
  services: CheckinServiceRow[];
  overrides: OccurrenceOverride[];
  attendees: AttendeeRow[];
  checkins: CheckinRow[];
  followUps: FollowUpRow[];
  /** Walk-in totals per occurrence. Deliberately NOT merged into `checkins` —
   *  they have no attendee and no attendee_type, so folding them in would
   *  break both the per-person history and the guest/member breakdown. */
  walkins: Map<string, number>;
};

export async function loadAttendanceDataset(): Promise<AttendanceDataset> {
  const db = supabaseAdmin();
  const [services, overrides, attendees, checkins, followUps, walkins] = await Promise.all([
    loadServices(),
    loadOverrides(),
    db.from("attendees").select("*").order("created_at"),
    db.from("checkins").select("*").order("checked_in_at", { ascending: false }),
    db.from("attendance_follow_ups").select("*"),
    loadWalkinCounts(),
  ]);
  if (attendees.error) throw new Error(`attendees load failed: ${attendees.error.message}`);
  if (checkins.error) throw new Error(`checkins load failed: ${checkins.error.message}`);
  if (followUps.error) throw new Error(`follow-ups load failed: ${followUps.error.message}`);
  return {
    services,
    overrides,
    attendees: (attendees.data ?? []) as AttendeeRow[],
    checkins: (checkins.data ?? []) as CheckinRow[],
    followUps: (followUps.data ?? []) as FollowUpRow[],
    walkins,
  };
}

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

// Best-effort in-memory rate limiter for the public find-me flow. Per
// serverless instance, so it resets on cold starts — acceptable at church
// scale; the real guard is the exact-triple match requirement.
const attempts = new Map<string, number[]>();

export function allowAttempt(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < windowMs);
  if (recent.length >= max) {
    attempts.set(key, recent);
    return false;
  }
  recent.push(now);
  attempts.set(key, recent);
  return true;
}
