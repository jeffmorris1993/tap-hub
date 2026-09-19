"use server";

import { supabaseAdmin } from "../../../lib/supabase/server";
import { supabaseSession } from "../../../lib/supabase/auth";
import {
  detroitDayIso,
  nextOccurrence,
  occurrenceOnDate,
} from "../../../lib/event-calendar";
import type { RecurringEventFields } from "../../../lib/events-occurrence";

export type EventSignupInput = {
  slug: string;
  name: string;
  contact: string;
  role: "attendee" | "volunteer";
  notes?: string;
  /** Detroit calendar date (YYYY-MM-DD) of the occurrence being joined. */
  occurrenceDate?: string;
};

export type EventSignupResult =
  | { ok: true; role: "attendee" | "volunteer" }
  | { ok: false; error: string };

export async function submitEventSignup(input: EventSignupInput): Promise<EventSignupResult> {
  if (!input.name?.trim()) return { ok: false, error: "Please share your name." };
  if (!input.contact?.trim()) return { ok: false, error: "Email or phone helps us follow up." };

  const sb = supabaseAdmin();
  const { data: event, error: lookupError } = await sb
    .from("events")
    .select("id, allow_volunteers, starts_at, ends_at, recurrence_kind, recurrence_byday, recurrence_until")
    .eq("slug", input.slug)
    .limit(1);
  if (lookupError) {
    console.error("[event-signup] lookup failed", lookupError);
    return { ok: false, error: "Couldn't find that event. Try again." };
  }
  const row = event?.[0];
  if (!row) return { ok: false, error: "That event no longer exists." };
  if (input.role === "volunteer" && !row.allow_volunteers) {
    return { ok: false, error: "This event isn't accepting volunteers." };
  }

  // Resolve which date this signup is for. The client's date is never
  // trusted: it must be a genuine occurrence of the series, and upcoming.
  const recurring = (row as RecurringEventFields).recurrence_kind !== "none";
  let occurrenceDate: string | null = null;
  if (recurring) {
    const now = new Date();
    if (input.occurrenceDate) {
      const occ = occurrenceOnDate(row as RecurringEventFields, input.occurrenceDate);
      if (!occ) {
        return { ok: false, error: "That date isn't part of this event's schedule." };
      }
      if (occ.getTime() < now.getTime()) {
        return { ok: false, error: "That date has already passed — pick an upcoming one." };
      }
      occurrenceDate = input.occurrenceDate;
    } else {
      // Older clients (or direct calls) without a date join the next one.
      const next = nextOccurrence(row as RecurringEventFields, now);
      occurrenceDate = next ? detroitDayIso(next) : null;
    }
  }

  // Link the signup to the signed-in account when there is one, so it shows
  // up under "My Events". Anonymous signups are still fine.
  let userId: string | null = null;
  try {
    const session = await supabaseSession();
    const { data } = await session.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // No session cookies (or auth unavailable) — anonymous signup.
  }

  const notes = input.notes?.trim();
  const { error } = await sb.from("event_signups").insert({
    event_id: row.id,
    name: input.name.trim(),
    contact: input.contact.trim(),
    role: input.role,
    notes: notes ? notes : null,
    occurrence_date: occurrenceDate,
    user_id: userId,
  });
  if (error) {
    console.error("[event-signup] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  return { ok: true, role: input.role };
}
