import "server-only";

import { createHash } from "crypto";
import { supabaseAdmin } from "./supabase/server";
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

export async function loadOverrides(): Promise<OccurrenceOverride[]> {
  const { data, error } = await supabaseAdmin()
    .from("checkin_occurrence_overrides")
    .select("service_id, occurrence_date, did_not_occur");
  if (error) throw new Error(`occurrence overrides load failed: ${error.message}`);
  return (data ?? []) as OccurrenceOverride[];
}

export type AttendanceDataset = {
  services: CheckinServiceRow[];
  overrides: OccurrenceOverride[];
  attendees: AttendeeRow[];
  checkins: CheckinRow[];
  followUps: FollowUpRow[];
};

export async function loadAttendanceDataset(): Promise<AttendanceDataset> {
  const db = supabaseAdmin();
  const [services, overrides, attendees, checkins, followUps] = await Promise.all([
    loadServices(),
    loadOverrides(),
    db.from("attendees").select("*").order("created_at"),
    db.from("checkins").select("*").order("checked_in_at", { ascending: false }),
    db.from("attendance_follow_ups").select("*"),
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
