"use server";

import { revalidatePath } from "next/cache";
import { assertPastoral } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import {
  consecutiveMissStreak,
  heldSundayDates,
  type AttendeeType,
  type FollowUpStatus,
} from "../../../../lib/attendance";
import { loadOverrides, loadServices } from "../../../../lib/attendance-data";
import { detroitDateIso } from "../../../../lib/tz";

export type AttendanceActionResult = { ok: true } | { ok: false; error: string };

function revalidate() {
  revalidatePath("/portal/attendance");
  revalidatePath("/checkin");
}

function validMinutes(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 0 && n <= 1439;
}

function validWindow(input: {
  serviceMinutes: number;
  opensMinutes: number;
  closesMinutes: number;
}): string | null {
  if (!validMinutes(input.serviceMinutes) || !validMinutes(input.opensMinutes) || !validMinutes(input.closesMinutes)) {
    return "Times must be valid times of day.";
  }
  if (input.opensMinutes >= input.closesMinutes) {
    return "Check-in must open before it closes.";
  }
  return null;
}

export async function addOneOffService(input: {
  name: string;
  dateIso: string;
  serviceMinutes: number;
  opensMinutes: number;
  closesMinutes: number;
}): Promise<AttendanceActionResult> {
  const actor = await assertPastoral();
  const name = input.name?.trim() ?? "";
  if (!name) return { ok: false, error: "Add a name for the service." };
  if (name.length > 120) return { ok: false, error: "That name is too long." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dateIso ?? "")) {
    return { ok: false, error: "Add a date for the service." };
  }
  const windowError = validWindow(input);
  if (windowError) return { ok: false, error: windowError };

  const { error } = await supabaseAdmin().from("checkin_services").insert({
    name,
    kind: "oneoff",
    service_date: input.dateIso,
    service_minutes: input.serviceMinutes,
    opens_minutes: input.opensMinutes,
    closes_minutes: input.closesMinutes,
    updated_by: actor.email,
  });
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function updateRecurringService(
  id: string,
  input: {
    dayOfWeek: number;
    serviceMinutes: number;
    opensMinutes: number;
    closesMinutes: number;
    enabled: boolean;
  },
): Promise<AttendanceActionResult> {
  const actor = await assertPastoral();
  if (!Number.isInteger(input.dayOfWeek) || input.dayOfWeek < 0 || input.dayOfWeek > 6) {
    return { ok: false, error: "Pick a day of the week." };
  }
  const windowError = validWindow(input);
  if (windowError) return { ok: false, error: windowError };

  const { error } = await supabaseAdmin()
    .from("checkin_services")
    .update({
      day_of_week: input.dayOfWeek,
      service_minutes: input.serviceMinutes,
      opens_minutes: input.opensMinutes,
      closes_minutes: input.closesMinutes,
      enabled: input.enabled === true,
      updated_by: actor.email,
    })
    .eq("id", id)
    .eq("kind", "recurring");
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function deleteOneOffService(id: string): Promise<AttendanceActionResult> {
  await assertPastoral();
  const { error } = await supabaseAdmin()
    .from("checkin_services")
    .delete()
    .eq("id", id)
    .eq("kind", "oneoff");
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

export async function setOccurrenceDidNotOccur(
  serviceId: string,
  dateIso: string,
  didNotOccur: boolean,
): Promise<AttendanceActionResult> {
  const actor = await assertPastoral();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return { ok: false, error: "Bad date." };

  const sb = supabaseAdmin();
  const { error } = didNotOccur
    ? (
        await sb.from("checkin_occurrence_overrides").upsert({
          service_id: serviceId,
          occurrence_date: dateIso,
          did_not_occur: true,
          updated_by: actor.email,
          updated_at: new Date().toISOString(),
        })
      )
    : (
        await sb
          .from("checkin_occurrence_overrides")
          .delete()
          .eq("service_id", serviceId)
          .eq("occurrence_date", dateIso)
      );
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

const FOLLOW_UP_STATUSES: FollowUpStatus[] = ["needs", "contacted", "resolved", "dismissed"];

export async function setFollowUpStatus(
  attendeeId: string,
  status: FollowUpStatus,
): Promise<AttendanceActionResult> {
  const actor = await assertPastoral();
  if (!FOLLOW_UP_STATUSES.includes(status)) return { ok: false, error: "Unknown status." };

  const sb = supabaseAdmin();

  // Anchor the status to the attendee's current latest missed Sunday so it
  // automatically reverts to "needs" if they keep missing afterwards.
  const [services, overrides, { data: checkinRows, error: checkinError }] = await Promise.all([
    loadServices(),
    loadOverrides(),
    sb.from("checkins").select("occurrence_date").eq("attendee_id", attendeeId),
  ]);
  if (checkinError) return { ok: false, error: checkinError.message };
  const dates = ((checkinRows ?? []) as { occurrence_date: string }[])
    .map((r) => r.occurrence_date)
    .sort();
  const firstDate = dates[0];
  let missAnchor: string | null = null;
  if (firstDate) {
    const todayIso = detroitDateIso();
    const sundays = heldSundayDates(services, overrides, firstDate, todayIso);
    missAnchor = consecutiveMissStreak(sundays, new Set(dates), firstDate).latestMiss;
  }

  const { error } = await sb.from("attendance_follow_ups").upsert({
    attendee_id: attendeeId,
    status,
    miss_anchor: missAnchor,
    updated_by: actor.email,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}

/**
 * Reclassify someone (guest → regular/member, or back). Guest check-ins
 * notify the welcome team every time, so moving a guest who now attends
 * regularly to "Regular Attendee" is how staff stop those notifications.
 * Past check-in rows keep the category they were recorded with, so history
 * and the trend chart don't change retroactively.
 */
export async function setAttendeeType(
  attendeeId: string,
  type: AttendeeType,
): Promise<AttendanceActionResult> {
  await assertPastoral();
  if (!["member", "regular", "first", "returning"].includes(type)) {
    return { ok: false, error: "Unknown category." };
  }

  const { error } = await supabaseAdmin()
    .from("attendees")
    .update({ attendee_type: type })
    .eq("id", attendeeId);
  if (error) return { ok: false, error: error.message };

  revalidate();
  return { ok: true };
}
