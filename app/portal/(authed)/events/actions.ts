"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { listApproverEmails } from "../../../../lib/approvers";
import { assertLead, getPortalUser, type PortalUser } from "../../../../lib/portal-auth";
import { recurrenceLabel, type RecurrenceKind } from "../../../../lib/events-occurrence";
import {
  notifyApproversOfSubmission,
  notifySubmitterOfApproval,
  notifySubmitterOfRejection,
  type EventSnapshot,
} from "../../../../lib/email/event-approval";
import {
  pushSubmissionToApprovers,
  pushApprovalToSubmitter,
  pushRejectionToSubmitter,
} from "../../../../lib/chat-notifications";
import {
  parseSignupQuestions,
  validateQuestionConfig,
  type SignupQuestions,
} from "../../../../lib/event-signup-forms";

export type EventFormInput = {
  id?: string;
  slug: string;
  title: string;
  description_long: string;
  category: "Youth" | "Sisterhood" | "Brotherhood" | "Marriage" | "General";
  /** ISO datetime-local string (e.g. "2026-04-05T12:00") in local time. */
  starts_at_local: string;
  ends_at_local: string;
  location: string;
  cost: string | null;
  accepts_rsvps: boolean;
  allow_volunteers: boolean;
  registration_url: string | null;
  registration_label: string | null;
  recurrence_kind: RecurrenceKind;
  recurrence_byday: number | null;
  recurrence_until: string | null;
  signup_questions?: SignupQuestions;
};

export type EventActionResult = { ok: true; id: string } | { ok: false; error: string };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

// Imported here (not at top) so we keep this file's import block minimal.
import { localToUtcIso } from "../../../../lib/tz";

function toIso(localValue: string): string | null {
  // Interpret the form's datetime-local string as wall-clock time in the
  // church's timezone (Detroit) — otherwise Vercel's UTC server would
  // store "9 AM" as 9 AM UTC = 5 AM EDT.
  return localToUtcIso(localValue);
}

/** Events are staff surfaces: lead (scoped to their ministries) or pastoral. */
async function requireStaff(): Promise<PortalUser> {
  return assertLead();
}

/** Leads may only touch events in their own ministries. */
function inScope(pu: PortalUser, category: string): boolean {
  return pu.role === "pastoral" || pu.ministries.includes(category);
}

async function eventCategory(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("events").select("category").eq("id", id).limit(1);
  return (data?.[0] as { category?: string } | undefined)?.category ?? null;
}

function revalidateAllEventSurfaces(slug?: string) {
  revalidatePath("/events");
  if (slug) revalidatePath(`/events/${slug}`);
  revalidatePath("/today");
  revalidatePath("/");
  revalidatePath("/portal/events");
  revalidatePath("/portal/events/pending");
  revalidatePath("/portal");
}

/** Save edits without changing approval status. Approver-only changes (e.g.
 *  flipping published on an approved event) go through approve/reject paths. */
export async function saveEvent(input: EventFormInput): Promise<EventActionResult> {
  const pu = await requireStaff();
  if (!inScope(pu, input.category)) {
    return { ok: false, error: `You can only manage ${pu.ministries.join(", ") || "your ministry's"} events.` };
  }
  if (input.id) {
    const existing = await eventCategory(input.id);
    if (existing && !inScope(pu, existing)) {
      return { ok: false, error: "That event belongs to another ministry." };
    }
  }
  const sb = supabaseAdmin();

  const title = input.title.trim();
  const description_long = input.description_long.trim();
  const location = input.location.trim();
  const slug = (input.slug.trim() || slugify(title)) || `event-${Date.now()}`;
  const starts_at = toIso(input.starts_at_local);
  if (!title) return { ok: false, error: "Title is required." };
  if (!description_long) return { ok: false, error: "Description is required." };
  if (!starts_at) return { ok: false, error: "Start time is invalid." };
  if (!location) return { ok: false, error: "Location is required." };
  const ends_at = toIso(input.ends_at_local);

  // Custom signup questions: validate the RAW client value (so blank labels
  // and optionless choice questions surface as save errors instead of being
  // silently dropped), then store only the sanitized parse.
  const questionError = validateQuestionConfig(input.signup_questions);
  if (questionError) return { ok: false, error: questionError };
  const signup_questions = parseSignupQuestions(input.signup_questions);

  const payload = {
    slug: slugify(slug),
    title,
    description_long,
    category: input.category,
    starts_at,
    ends_at,
    location,
    accepts_rsvps: input.accepts_rsvps,
    allow_volunteers: input.allow_volunteers,
    registration_url: input.registration_url?.trim() ? input.registration_url.trim() : null,
    registration_label: input.registration_label?.trim() ? input.registration_label.trim() : null,
    cost: input.cost?.trim() ? input.cost.trim() : null,
    recurrence_kind: input.recurrence_kind,
    recurrence_byday: input.recurrence_kind === "weekly" || input.recurrence_kind === "biweekly"
      ? input.recurrence_byday
      : null,
    recurrence_until: input.recurrence_until || null,
    signup_questions,
  };

  if (input.id) {
    const { error } = await sb.from("events").update(payload).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidateAllEventSurfaces(payload.slug);
    return { ok: true, id: input.id };
  }

  const { data, error } = await sb
    .from("events")
    .insert({
      ...payload,
      // New events start as drafts. Submitter calls submitForApproval to push
      // it into the queue.
      approval_status: "draft",
      published: false,
    })
    .select("id")
    .limit(1);
  if (error) return { ok: false, error: error.message };
  revalidateAllEventSurfaces(payload.slug);
  return { ok: true, id: data?.[0]?.id ?? "" };
}

async function loadSnapshot(id: string): Promise<EventSnapshot | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select("id, slug, title, category, starts_at, location, description_long, cost, recurrence_kind")
    .eq("id", id)
    .limit(1);
  if (error || !data?.[0]) return null;
  const row = data[0] as unknown as EventSnapshot;
  return { ...row, recurrence_label: recurrenceLabel(row.recurrence_kind, row.starts_at) };
}

export async function submitForApproval(id: string): Promise<EventActionResult> {
  const pu = await requireStaff();
  const email = pu.email;
  const category = await eventCategory(id);
  if (category && !inScope(pu, category)) {
    return { ok: false, error: "That event belongs to another ministry." };
  }

  // Pastoral leadership doesn't need to send their own events through the
  // queue. Auto-approve + publish in one step.
  if (pu.role === "pastoral") {
    return publishDirectly(id, email);
  }

  const sb = supabaseAdmin();
  const { error } = await sb
    .from("events")
    .update({
      approval_status: "pending",
      submitted_by: email,
      submitted_at: new Date().toISOString(),
      approval_notes: null,
      published: false,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const snap = await loadSnapshot(id);
  if (snap) {
    const approvers = await listApproverEmails();
    await Promise.all([
      notifyApproversOfSubmission(snap, email, approvers),
      pushSubmissionToApprovers(
        { id: snap.id, slug: snap.slug, title: snap.title, category: snap.category, starts_at: snap.starts_at, location: snap.location, recurrence_kind: snap.recurrence_kind ?? "none" },
        email,
        approvers,
      ),
    ]);
  }

  revalidateAllEventSurfaces();
  return { ok: true, id };
}

/** Pastoral-only: publish an event immediately without going through the queue. */
export async function publishEvent(id: string): Promise<EventActionResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") return { ok: false, error: "Only pastoral leadership can publish directly." };
  return publishDirectly(id, pu.email);
}

async function publishDirectly(id: string, email: string): Promise<EventActionResult> {
  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("events")
    .update({
      approval_status: "approved",
      submitted_by: email,
      submitted_at: now,
      reviewed_by: email,
      reviewed_at: now,
      approval_notes: null,
      published: true,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAllEventSurfaces();
  return { ok: true, id };
}

export async function approveEvent(id: string): Promise<EventActionResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") return { ok: false, error: "Only pastoral leadership can approve." };
  const email = pu.email;
  const sb = supabaseAdmin();

  // Fetch submitter before update so we can email them.
  const { data: pre } = await sb
    .from("events")
    .select("submitted_by, slug")
    .eq("id", id)
    .limit(1);
  const submittedBy = (pre?.[0] as { submitted_by?: string } | undefined)?.submitted_by ?? null;

  const { error } = await sb
    .from("events")
    .update({
      approval_status: "approved",
      reviewed_by: email,
      reviewed_at: new Date().toISOString(),
      approval_notes: null,
      published: true,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const snap = await loadSnapshot(id);
  if (snap && submittedBy) {
    await Promise.all([
      notifySubmitterOfApproval(snap, submittedBy, email),
      pushApprovalToSubmitter(
        { id: snap.id, slug: snap.slug, title: snap.title, category: snap.category, starts_at: snap.starts_at, location: snap.location, recurrence_kind: snap.recurrence_kind ?? "none" },
        submittedBy,
        email,
      ),
    ]);
  }

  revalidateAllEventSurfaces();
  return { ok: true, id };
}

export async function rejectEvent(id: string, notes: string): Promise<EventActionResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") return { ok: false, error: "Only pastoral leadership can reject." };
  const email = pu.email;
  if (!notes.trim()) return { ok: false, error: "Please include notes explaining what needs to change." };
  const sb = supabaseAdmin();

  const { data: pre } = await sb
    .from("events")
    .select("submitted_by, slug")
    .eq("id", id)
    .limit(1);
  const submittedBy = (pre?.[0] as { submitted_by?: string } | undefined)?.submitted_by ?? null;

  const { error } = await sb
    .from("events")
    .update({
      approval_status: "rejected",
      reviewed_by: email,
      reviewed_at: new Date().toISOString(),
      approval_notes: notes.trim(),
      published: false,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  const snap = await loadSnapshot(id);
  if (snap && submittedBy) {
    await Promise.all([
      notifySubmitterOfRejection(snap, submittedBy, email, notes.trim()),
      pushRejectionToSubmitter(
        { id: snap.id, slug: snap.slug, title: snap.title, category: snap.category, starts_at: snap.starts_at, location: snap.location, recurrence_kind: snap.recurrence_kind ?? "none" },
        submittedBy,
        email,
        notes.trim(),
      ),
    ]);
  }

  revalidateAllEventSurfaces();
  return { ok: true, id };
}

export async function deleteEvent(id: string): Promise<void> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") throw new Error("Only pastoral leadership can delete events.");
  const sb = supabaseAdmin();
  const { error } = await sb.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAllEventSurfaces();
  redirect("/portal/events");
}

export async function unpublishEvent(id: string): Promise<EventActionResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") return { ok: false, error: "Only pastoral leadership can unpublish." };
  const { error } = await supabaseAdmin().from("events").update({ published: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAllEventSurfaces();
  return { ok: true, id };
}

export async function republishEvent(id: string): Promise<EventActionResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") return { ok: false, error: "Only pastoral leadership can publish." };
  // Can only republish events that are currently approved.
  const { data } = await supabaseAdmin()
    .from("events")
    .select("approval_status")
    .eq("id", id)
    .limit(1);
  const status = (data?.[0] as { approval_status?: string } | undefined)?.approval_status;
  if (status !== "approved") return { ok: false, error: "Event must be approved before publishing." };
  const { error } = await supabaseAdmin().from("events").update({ published: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAllEventSurfaces();
  return { ok: true, id };
}

/** Returns true if the current user can approve/reject events (pastoral). */
export async function currentUserCanApprove(): Promise<boolean> {
  const pu = await getPortalUser();
  return pu?.role === "pastoral";
}
