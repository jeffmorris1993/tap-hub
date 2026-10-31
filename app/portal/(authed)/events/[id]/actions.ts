"use server";

import { revalidatePath } from "next/cache";
import { assertLead, type PortalUser } from "../../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import {
  getAdminEventById,
  type AdminEventRow,
} from "../../../../../lib/supabase/admin-queries";
import { detroitDayIso, occurrenceOnDate } from "../../../../../lib/event-calendar";
import { detroitMinutesOf } from "../../../../../lib/tz";

export type EventCheckinResult = { ok: true } | { ok: false; error: string };

/** Minutes before the event start that check-in opens by default. */
const OPENS_BEFORE = 60;
/** Minutes after the end (or after the start, when there's no end) it closes. */
const CLOSES_AFTER_END = 60;
const CLOSES_AFTER_START = 120;

const DAY = 1440;

function clampMinutes(n: number): number {
  return Math.min(DAY - 1, Math.max(0, Math.round(n)));
}

type EventAccess =
  | { ok: false; error: string }
  | { ok: true; pu: PortalUser; event: AdminEventRow };

/**
 * A lead may only touch events in their own ministries; pastoral sees all.
 * Re-checked here rather than trusted from the page, because Server Actions
 * are reachable by direct POST.
 */
async function requireEventAccess(eventId: string): Promise<EventAccess> {
  let pu: PortalUser;
  try {
    pu = await assertLead();
  } catch {
    return { ok: false, error: "Not authorized." };
  }
  const event = await getAdminEventById(eventId);
  if (!event) return { ok: false, error: "That event no longer exists." };
  if (pu.role !== "pastoral" && !pu.ministries.includes(event.category)) {
    return { ok: false, error: "You can only manage events in your own ministries." };
  }
  return { ok: true, pu, event };
}

/**
 * Open arrival check-in for one occurrence of an event.
 *
 * The window is a one-off checkin_services row owned by the event, so the
 * public /checkin flow, the attendance reports and the summary email all pick
 * it up with no special-casing. Upserts on the (event_id, service_date) unique
 * index, which makes re-opening the same date idempotent.
 */
export async function openEventCheckin(input: {
  eventId: string;
  /** Detroit YYYY-MM-DD — must be a real occurrence of the series. */
  occurrenceDate: string;
  opensMinutes?: number;
  closesMinutes?: number;
}): Promise<EventCheckinResult> {
  const access = await requireEventAccess(input.eventId);
  if (!access.ok) return { ok: false, error: access.error };
  const { event } = access;

  // Never trust the date: resolve it against the recurrence rule so a
  // hand-edited value can't invent an occurrence that doesn't exist.
  const start = occurrenceOnDate(event, input.occurrenceDate);
  if (!start) {
    return { ok: false, error: "That isn't a date this event runs on." };
  }

  const startMinutes = detroitMinutesOf(start);
  const end = event.ends_at ? new Date(event.ends_at) : null;
  // Only use the end time when it lands on the same Detroit day — a multi-day
  // block would otherwise produce a nonsense closing minute.
  const endMinutes =
    end && !isNaN(end.getTime()) && detroitDayIso(end) === input.occurrenceDate
      ? detroitMinutesOf(end)
      : null;

  let opens = clampMinutes(input.opensMinutes ?? startMinutes - OPENS_BEFORE);
  let closes = clampMinutes(
    input.closesMinutes ??
      (endMinutes !== null ? endMinutes + CLOSES_AFTER_END : startMinutes + CLOSES_AFTER_START),
  );
  // An all-day or late-evening event can push both ends to the same clamp.
  if (closes <= opens) {
    opens = clampMinutes(Math.min(opens, DAY - 2));
    closes = clampMinutes(Math.max(opens + 1, closes));
  }

  const { error } = await supabaseAdmin()
    .from("checkin_services")
    .upsert(
      {
        name: event.title,
        kind: "oneoff",
        day_of_week: null,
        service_date: input.occurrenceDate,
        service_minutes: clampMinutes(startMinutes),
        opens_minutes: opens,
        closes_minutes: closes,
        enabled: true,
        event_id: event.id,
        updated_by: access.pu.email,
      },
      { onConflict: "event_id,service_date" },
    );
  if (error) {
    console.error("[events] open check-in failed", error);
    return { ok: false, error: error.message };
  }

  revalidatePath(`/portal/events/${event.id}`);
  revalidatePath("/portal/attendance");
  revalidatePath("/checkin");
  return { ok: true };
}

/** Adjust an open window's hours without recreating it. */
export async function updateEventCheckinWindow(input: {
  eventId: string;
  serviceId: string;
  opensMinutes: number;
  closesMinutes: number;
}): Promise<EventCheckinResult> {
  const access = await requireEventAccess(input.eventId);
  if (!access.ok) return { ok: false, error: access.error };

  const opens = clampMinutes(input.opensMinutes);
  const closes = clampMinutes(input.closesMinutes);
  if (closes <= opens) {
    return { ok: false, error: "Check-in has to close after it opens." };
  }

  const { error } = await supabaseAdmin()
    .from("checkin_services")
    .update({ opens_minutes: opens, closes_minutes: closes, updated_by: access.pu.email })
    .eq("id", input.serviceId)
    .eq("event_id", input.eventId);
  if (error) {
    console.error("[events] update check-in window failed", error);
    return { ok: false, error: error.message };
  }

  revalidatePath(`/portal/events/${input.eventId}`);
  revalidatePath("/portal/attendance");
  revalidatePath("/checkin");
  return { ok: true };
}

/**
 * Stop accepting check-ins. Disables the window rather than deleting it, so
 * everyone who already checked in stays in the attendance history.
 */
export async function closeEventCheckin(input: {
  eventId: string;
  serviceId: string;
}): Promise<EventCheckinResult> {
  const access = await requireEventAccess(input.eventId);
  if (!access.ok) return { ok: false, error: access.error };

  const { error } = await supabaseAdmin()
    .from("checkin_services")
    .update({ enabled: false, updated_by: access.pu.email })
    .eq("id", input.serviceId)
    .eq("event_id", input.eventId);
  if (error) {
    console.error("[events] close check-in failed", error);
    return { ok: false, error: error.message };
  }

  revalidatePath(`/portal/events/${input.eventId}`);
  revalidatePath("/portal/attendance");
  revalidatePath("/checkin");
  return { ok: true };
}
