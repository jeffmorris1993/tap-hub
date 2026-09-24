"use server";

import { supabaseAdmin } from "../../../lib/supabase/server";
import { supabaseSession } from "../../../lib/supabase/auth";
import {
  detroitDayIso,
  nextOccurrence,
  occurrenceOnDate,
} from "../../../lib/event-calendar";
import type { RecurringEventFields } from "../../../lib/events-occurrence";
import {
  buildStoredResponses,
  parseSignupQuestions,
  questionsForRole,
  validateAnswers,
  type SignupAnswers,
} from "../../../lib/event-signup-forms";

export type EventSignupInput = {
  slug: string;
  name: string;
  contact: string;
  role: "attendee" | "volunteer";
  notes?: string;
  /** Attendees only: "attending for sure?" — yes | maybe. */
  attendance?: string;
  /** Answers to the event's custom questions, keyed by field id. */
  responses?: SignupAnswers;
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
    .select("id, allow_volunteers, signup_questions, starts_at, ends_at, recurrence_kind, recurrence_byday, recurrence_until")
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

  // Attendees say whether they're coming for sure; volunteers never do.
  let attendance: "yes" | "maybe" | null = null;
  if (input.role === "attendee") {
    if (input.attendance !== "yes" && input.attendance !== "maybe") {
      return { ok: false, error: "Let us know if you're attending for sure." };
    }
    attendance = input.attendance;
  }

  // Custom questions replace the generic notes field for their role. Answers
  // are validated against the event's current schema — choice values are
  // whitelisted, unknown keys dropped, labels snapshotted from the schema.
  const fields = questionsForRole(parseSignupQuestions(row.signup_questions), input.role);
  if (fields.length > 0) {
    const errors = validateAnswers(fields, input.responses ?? {});
    const first = Object.values(errors)[0];
    if (first) return { ok: false, error: first };
  }
  const responses = fields.length > 0 ? buildStoredResponses(fields, input.responses ?? {}) : null;

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

  const notes = fields.length > 0 ? null : input.notes?.trim() || null;
  const { error } = await sb.from("event_signups").insert({
    event_id: row.id,
    name: input.name.trim(),
    contact: input.contact.trim(),
    role: input.role,
    notes,
    attendance,
    responses: responses && responses.length > 0 ? responses : null,
    occurrence_date: occurrenceDate,
    user_id: userId,
  });
  if (error) {
    console.error("[event-signup] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  return { ok: true, role: input.role };
}
