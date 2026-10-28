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
  type SignupRole,
  type StoredResponse,
} from "../../../lib/event-signup-forms";
import { notifyOrganizerOfSignup, notifySignerOfSignup } from "../../../lib/email/event-signup";
import { listApproverEmails } from "../../../lib/approvers";
import { formatWhenText } from "../../../lib/events-display";
import type { EventRow } from "../../../lib/supabase/queries";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EventSignupInput = {
  slug: string;
  name: string;
  contact: string;
  /** One or both roles — a person can attend AND volunteer in one submission. */
  roles?: SignupRole[];
  /** Legacy single-role clients (pre-combined-flow tabs still open). */
  role?: SignupRole;
  notes?: string;
  /** Required when attending: "attending for sure?" — yes | maybe. */
  attendance?: string;
  /** Answers to the attendee form's custom questions, keyed by field id. */
  attendeeResponses?: SignupAnswers;
  /** Answers to the volunteer form's custom questions, keyed by field id. */
  volunteerResponses?: SignupAnswers;
  /** Legacy answers for the single `role`. */
  responses?: SignupAnswers;
  /** Detroit calendar date (YYYY-MM-DD) of the occurrence being joined. */
  occurrenceDate?: string;
};

export type EventSignupResult =
  | { ok: true; roles: SignupRole[] }
  | { ok: false; error: string };

export async function submitEventSignup(input: EventSignupInput): Promise<EventSignupResult> {
  if (!input.name?.trim()) return { ok: false, error: "Please share your name." };
  if (!input.contact?.trim()) return { ok: false, error: "Email or phone helps us follow up." };

  // Accept the new multi-role shape and the legacy single `role`, dropping
  // anything that isn't a real role.
  const roles: SignupRole[] = [];
  for (const r of input.roles ?? (input.role ? [input.role] : [])) {
    if ((r === "attendee" || r === "volunteer") && !roles.includes(r)) roles.push(r);
  }
  if (roles.length === 0) {
    return { ok: false, error: "Pick whether you're attending, volunteering, or both." };
  }

  const sb = supabaseAdmin();
  const { data: event, error: lookupError } = await sb
    .from("events")
    .select("id, slug, title, location, submitted_by, allow_volunteers, signup_mode, signup_questions, starts_at, ends_at, recurrence_kind, recurrence_interval, recurrence_bydays, recurrence_count, recurrence_until, all_day")
    .eq("slug", input.slug)
    .limit(1);
  if (lookupError) {
    console.error("[event-signup] lookup failed", lookupError);
    return { ok: false, error: "Couldn't find that event. Try again." };
  }
  const row = event?.[0];
  if (!row) return { ok: false, error: "That event no longer exists." };
  if (roles.includes("volunteer") && !row.allow_volunteers) {
    return { ok: false, error: "This event isn't accepting volunteers." };
  }

  // Attendees say whether they're coming for sure; volunteer rows never do,
  // and participation-mode events (signup tracks a commitment like gifting,
  // not attendance) skip the question entirely.
  let attendance: "yes" | "maybe" | null = null;
  if (roles.includes("attendee") && row.signup_mode !== "participate") {
    if (input.attendance !== "yes" && input.attendance !== "maybe") {
      return { ok: false, error: "Let us know if you're attending for sure." };
    }
    attendance = input.attendance;
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

  // One row per role, validated against that role's custom questions.
  // Custom questions replace the generic notes field for their role; choice
  // answers are whitelisted, unknown keys dropped, labels snapshotted.
  const sq = parseSignupQuestions(row.signup_questions);
  const inserts = [];
  const emailResponses: { role: SignupRole; items: StoredResponse[] }[] = [];
  for (const role of roles) {
    const fields = questionsForRole(sq, role);
    const answers =
      role === "attendee"
        ? (input.attendeeResponses ?? (input.role === "attendee" ? input.responses : undefined))
        : (input.volunteerResponses ?? (input.role === "volunteer" ? input.responses : undefined));
    if (fields.length > 0) {
      const errors = validateAnswers(fields, answers ?? {});
      const first = Object.values(errors)[0];
      if (first) return { ok: false, error: first };
    }
    const responses = fields.length > 0 ? buildStoredResponses(fields, answers ?? {}) : null;
    emailResponses.push({ role, items: responses ?? [] });
    inserts.push({
      event_id: row.id,
      name: input.name.trim(),
      contact: input.contact.trim(),
      role,
      notes: fields.length > 0 ? null : input.notes?.trim() || null,
      attendance: role === "attendee" ? attendance : null,
      responses: responses && responses.length > 0 ? responses : null,
      occurrence_date: occurrenceDate,
      user_id: userId,
    });
  }

  const { data: insertedRows, error } = await sb.from("event_signups").insert(inserts).select("id");
  if (error) {
    console.error("[event-signup] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  // Tell the organizer. Older events without a submitter fall back to the
  // pastoral list so no signup goes unnoticed.
  const organizer =
    typeof row.submitted_by === "string" && row.submitted_by.trim()
      ? [row.submitted_by.trim()]
      : await listApproverEmails();
  await notifyOrganizerOfSignup({
    to: organizer,
    event: { id: row.id, title: row.title },
    signup: {
      name: input.name.trim(),
      contact: input.contact.trim(),
      roles,
      attendance,
      occurrenceDate,
      notes: input.notes?.trim() || null,
      responses: emailResponses,
    },
  });

  // Confirm to the signer-up too, when their contact is an email address.
  const contact = input.contact.trim();
  if (EMAIL_RE.test(contact)) {
    const whenText = occurrenceDate
      ? `${fmtOccurrenceDay(occurrenceDate)}${row.all_day ? "" : ` · ${fmtStartTime(row.starts_at)}`}`
      : formatWhenText(row as unknown as EventRow, new Date());
    const sent = await notifySignerOfSignup({
      to: contact,
      event: { slug: row.slug, title: row.title, location: row.location },
      signup: { name: input.name.trim(), roles, attendance, occurrenceDate, whenText },
    });
    if (sent && insertedRows?.length) {
      await sb
        .from("event_signups")
        .update({ confirmation_sent_at: new Date().toISOString() })
        .in(
          "id",
          insertedRows.map((r) => (r as { id: string }).id),
        );
    }
  }

  return { ok: true, roles };
}

/** "2026-10-03" → "Fri, Oct 3, 2026" without timezone day-shift. */
function fmtOccurrenceDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmtStartTime(startsAtIso: string): string {
  return new Date(startsAtIso).toLocaleTimeString("en-US", {
    timeZone: "America/Detroit",
    hour: "numeric",
    minute: "2-digit",
  });
}
