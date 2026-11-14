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
import { syncEventToCalendar, removeEventFromCalendar } from "../../../../lib/google-calendar";
import { parseNotifyEmails } from "../../../../lib/event-notify";
import { FLYER_BUCKET, type FlyerMode, type FlyerStatus } from "../../../../lib/flyers";
import { listFlyerDesignerEmails } from "../../../../lib/flyer-designers";
import {
  notifyDesignersOfFlyerRequest,
  notifySubmitterOfApprovalAwaitingFlyer,
} from "../../../../lib/email/flyer";

export type EventFormInput = {
  id?: string;
  slug: string;
  title: string;
  description_long: string;
  category: "Youth" | "Sisterhood" | "Brotherhood" | "Marriage" | "Music" | "General";
  /** ISO datetime-local string (e.g. "2026-04-05T12:00") in local time. */
  starts_at_local: string;
  ends_at_local: string;
  location: string;
  cost: string | null;
  accepts_rsvps: boolean;
  /** What a signup means: an attendance RSVP, or a participation
   *  commitment (gifting, contributing) with no attendance question. */
  signup_mode: "attend" | "participate";
  allow_volunteers: boolean;
  registration_url: string | null;
  registration_label: string | null;
  recurrence_kind: RecurrenceKind;
  recurrence_interval: number;
  recurrence_bydays: number[] | null;
  recurrence_count: number | null;
  recurrence_until: string | null;
  all_day: boolean;
  signup_questions?: SignupQuestions;
  /** Raw recipients box — comma/newline separated. Blank = use the ministry
   *  leads for this event's category (see lib/event-notify.ts). */
  notify_emails_raw?: string | null;
  /** Flyer plan: upload your own, or request one from the design team.
   *  Omitted (older callers, e.g. agent tools) = leave the stored value
   *  alone ('none' for new events). */
  flyer_mode?: FlyerMode;
  /** Design brief for the request path. */
  flyer_request_notes?: string | null;
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

type EventMeta = {
  category: string;
  approval_status: string;
  published: boolean;
  flyer_mode: FlyerMode;
  flyer_status: FlyerStatus;
  flyer_path: string | null;
};

async function eventMeta(id: string): Promise<EventMeta | null> {
  const { data } = await supabaseAdmin()
    .from("events")
    .select("category, approval_status, published, flyer_mode, flyer_status, flyer_path")
    .eq("id", id)
    .limit(1);
  return (data?.[0] as EventMeta | undefined) ?? null;
}

/** Whether approving the event details may also publish it. A flyer that's
 *  submitted-with-file counts: round 1 reviews details and flyer together. */
function flyerAllowsPublish(meta: Pick<EventMeta, "flyer_mode" | "flyer_status" | "flyer_path">): boolean {
  return (
    meta.flyer_mode === "none" ||
    meta.flyer_status === "approved" ||
    (!!meta.flyer_path && meta.flyer_status === "submitted")
  );
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
  let existing: Awaited<ReturnType<typeof eventMeta>> = null;
  if (input.id) {
    existing = await eventMeta(input.id);
    if (existing && !inScope(pu, existing.category)) {
      return { ok: false, error: "That event belongs to another ministry." };
    }
    if (existing?.approval_status === "pending" && pu.role !== "pastoral") {
      return {
        ok: false,
        error: "This event is awaiting review and can't be edited. A pastor can approve it, or reject it with notes to unlock edits.",
      };
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

  // Refuse a mistyped recipient rather than silently dropping it — a dropped
  // address means someone stops hearing about their own event's signups.
  const notify = parseNotifyEmails(input.notify_emails_raw);
  if (notify.invalid.length > 0) {
    return {
      ok: false,
      error: `Not a valid email address: ${notify.invalid.join(", ")}`,
    };
  }

  const payload = {
    slug: slugify(slug),
    title,
    description_long,
    category: input.category,
    starts_at,
    ends_at,
    location,
    accepts_rsvps: input.accepts_rsvps,
    signup_mode: input.signup_mode === "participate" ? "participate" : "attend",
    allow_volunteers: input.allow_volunteers,
    registration_url: input.registration_url?.trim() ? input.registration_url.trim() : null,
    registration_label: input.registration_label?.trim() ? input.registration_label.trim() : null,
    cost: input.cost?.trim() ? input.cost.trim() : null,
    recurrence_kind: input.recurrence_kind,
    recurrence_interval:
      input.recurrence_kind === "none"
        ? 1
        : Math.min(12, Math.max(1, Math.round(input.recurrence_interval) || 1)),
    recurrence_bydays:
      input.recurrence_kind === "weekly" && input.recurrence_bydays?.length
        ? [...new Set(input.recurrence_bydays.filter((d) => d >= 0 && d <= 6))].sort((a, b) => a - b)
        : null,
    // "On a date" and "after N occurrences" are mutually exclusive ends.
    recurrence_until: input.recurrence_kind !== "none" && input.recurrence_until ? input.recurrence_until : null,
    recurrence_count:
      input.recurrence_kind !== "none" && !input.recurrence_until && input.recurrence_count
        ? Math.min(500, Math.max(1, Math.round(input.recurrence_count)))
        : null,
    all_day: !!input.all_day,
    signup_questions,
    // Empty stores as null so the resolver's ministry-lead default kicks in.
    notify_emails: notify.emails.length > 0 ? notify.emails : null,
  };

  // Flyer plan. Omitted input (agent tools) leaves stored values untouched.
  const flyerUpdate: Record<string, unknown> = {};
  const requestedDesignNow =
    input.flyer_mode === "requested" &&
    existing?.flyer_mode !== "requested" &&
    existing?.approval_status === "approved" &&
    existing?.flyer_status !== "approved";
  if (input.flyer_mode !== undefined) {
    flyerUpdate.flyer_mode = input.flyer_mode;
    flyerUpdate.flyer_request_notes =
      input.flyer_mode === "requested" ? input.flyer_request_notes?.trim() || null : null;
    const prevMode = existing?.flyer_mode ?? "none";
    if (input.flyer_mode !== prevMode) {
      if (input.flyer_mode === "none") {
        Object.assign(flyerUpdate, {
          flyer_status: "none",
          flyer_path: null,
          flyer_notes: null,
          flyer_uploaded_by: null,
          flyer_submitted_at: null,
          flyer_reviewed_by: null,
          flyer_reviewed_at: null,
        });
      } else if (input.flyer_mode === "requested") {
        // On already-approved events the request goes straight to the design
        // queue; otherwise it waits for round-1 approval.
        flyerUpdate.flyer_status = requestedDesignNow ? "awaiting_design" : "none";
      } else {
        // requested → uploaded: the creator decided to bring their own.
        flyerUpdate.flyer_status = existing?.flyer_path ? existing.flyer_status : "none";
      }
    }
  }

  if (input.id) {
    const { error } = await sb.from("events").update({ ...payload, ...flyerUpdate }).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    // Dropping the flyer entirely also drops the stored file.
    if (flyerUpdate.flyer_path === null && existing?.flyer_path) {
      await sb.storage.from(FLYER_BUCKET).remove([existing.flyer_path]);
    }
    if (requestedDesignNow) {
      const snap = await loadSnapshot(input.id);
      if (snap) {
        await notifyDesignersOfFlyerRequest(
          { id: snap.id, slug: snap.slug, title: snap.title, category: snap.category, starts_at: snap.starts_at, location: snap.location },
          await listFlyerDesignerEmails(),
          pu.email,
          input.flyer_request_notes?.trim() || null,
        );
      }
    }
    // Keep the church Google Calendar in step with edits to live events.
    if (existing?.published) await syncEventToCalendar(input.id);
    revalidateAllEventSurfaces(payload.slug);
    return { ok: true, id: input.id };
  }

  const { data, error } = await sb
    .from("events")
    .insert({
      ...payload,
      ...flyerUpdate,
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
  const meta = await eventMeta(id);
  if (meta && !inScope(pu, meta.category)) {
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
  const meta = await eventMeta(id);
  if (!meta) return { ok: false, error: "Event not found." };

  // The flyer gate applies to pastors too: a requested flyer means the event
  // lands approved-but-unpublished until the flyer clears round 2 (which the
  // same pastor can do themselves once it's submitted).
  const canPublish = flyerAllowsPublish(meta);
  const approvesFlyerToo = !!meta.flyer_path && meta.flyer_status === "submitted";

  const { error } = await supabaseAdmin()
    .from("events")
    .update({
      approval_status: "approved",
      submitted_by: email,
      submitted_at: now,
      reviewed_by: email,
      reviewed_at: now,
      approval_notes: null,
      published: canPublish,
      ...(approvesFlyerToo
        ? { flyer_status: "approved", flyer_notes: null, flyer_reviewed_by: email, flyer_reviewed_at: now }
        : {}),
      ...(!canPublish && meta.flyer_mode === "requested" && meta.flyer_status !== "rejected"
        ? { flyer_status: "awaiting_design" }
        : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (canPublish) {
    await syncEventToCalendar(id);
  } else if (meta.flyer_mode === "requested" && meta.flyer_status !== "rejected") {
    const snap = await loadSnapshot(id);
    if (snap) {
      const { data } = await supabaseAdmin()
        .from("events")
        .select("flyer_request_notes")
        .eq("id", id)
        .limit(1);
      await notifyDesignersOfFlyerRequest(
        { id: snap.id, slug: snap.slug, title: snap.title, category: snap.category, starts_at: snap.starts_at, location: snap.location },
        await listFlyerDesignerEmails(),
        email,
        (data?.[0] as { flyer_request_notes: string | null } | undefined)?.flyer_request_notes ?? null,
      );
    }
  }
  revalidateAllEventSurfaces();
  return { ok: true, id };
}

export async function approveEvent(id: string): Promise<EventActionResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") return { ok: false, error: "Only pastoral leadership can approve." };
  const email = pu.email;
  const sb = supabaseAdmin();

  // Fetch submitter + flyer state before update so we can email them and
  // apply the flyer publish gate.
  const { data: pre } = await sb
    .from("events")
    .select("submitted_by, slug, flyer_mode, flyer_status, flyer_path, flyer_request_notes")
    .eq("id", id)
    .limit(1);
  const preRow = pre?.[0] as
    | {
        submitted_by?: string;
        flyer_mode: FlyerMode;
        flyer_status: FlyerStatus;
        flyer_path: string | null;
        flyer_request_notes: string | null;
      }
    | undefined;
  if (!preRow) return { ok: false, error: "Event not found." };
  const submittedBy = preRow.submitted_by ?? null;

  const now = new Date().toISOString();
  const canPublish = flyerAllowsPublish(preRow);
  // Round 1 reviews details and an uploaded flyer together — approving the
  // event approves that flyer in the same stroke.
  const approvesFlyerToo = !!preRow.flyer_path && preRow.flyer_status === "submitted";

  const { error } = await sb
    .from("events")
    .update({
      approval_status: "approved",
      reviewed_by: email,
      reviewed_at: now,
      approval_notes: null,
      published: canPublish,
      ...(approvesFlyerToo
        ? { flyer_status: "approved", flyer_notes: null, flyer_reviewed_by: email, flyer_reviewed_at: now }
        : {}),
      ...(!canPublish && preRow.flyer_mode === "requested" && preRow.flyer_status !== "rejected"
        ? { flyer_status: "awaiting_design" }
        : {}),
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };

  if (canPublish) await syncEventToCalendar(id);

  const snap = await loadSnapshot(id);
  if (snap) {
    if (canPublish) {
      if (submittedBy) {
        await Promise.all([
          notifySubmitterOfApproval(snap, submittedBy, email),
          pushApprovalToSubmitter(
            { id: snap.id, slug: snap.slug, title: snap.title, category: snap.category, starts_at: snap.starts_at, location: snap.location, recurrence_kind: snap.recurrence_kind ?? "none" },
            submittedBy,
            email,
          ),
        ]);
      }
    } else {
      // Details approved but the event is held for its flyer: tell the
      // designers (request path) and give the submitter the honest version.
      const flyerSnap = { id: snap.id, slug: snap.slug, title: snap.title, category: snap.category, starts_at: snap.starts_at, location: snap.location };
      await Promise.all([
        preRow.flyer_mode === "requested" && preRow.flyer_status !== "rejected"
          ? notifyDesignersOfFlyerRequest(
              flyerSnap,
              await listFlyerDesignerEmails(),
              submittedBy,
              preRow.flyer_request_notes,
            )
          : Promise.resolve(),
        submittedBy && submittedBy !== email
          ? notifySubmitterOfApprovalAwaitingFlyer(flyerSnap, submittedBy, email, preRow.flyer_mode === "requested")
          : Promise.resolve(),
      ]);
    }
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

  await removeEventFromCalendar(id);

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
  // Before the row (and its stored calendar id) disappears.
  await removeEventFromCalendar(id);
  const sb = supabaseAdmin();
  // Clean up stored flyer files — the DB cascade can't reach storage.
  try {
    const { data: files } = await sb.storage.from(FLYER_BUCKET).list(id);
    if (files?.length) {
      await sb.storage.from(FLYER_BUCKET).remove(files.map((f) => `${id}/${f.name}`));
    }
  } catch (err) {
    console.warn("[events] flyer cleanup failed", err);
  }
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
  await removeEventFromCalendar(id);
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
  const meta = await eventMeta(id);
  if (meta && !(meta.flyer_mode === "none" || meta.flyer_status === "approved")) {
    return { ok: false, error: "This event's flyer isn't approved yet — approve the flyer (or remove it) first." };
  }
  const { error } = await supabaseAdmin().from("events").update({ published: true }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await syncEventToCalendar(id);
  revalidateAllEventSurfaces();
  return { ok: true, id };
}

/** Returns true if the current user can approve/reject events (pastoral). */
export async function currentUserCanApprove(): Promise<boolean> {
  const pu = await getPortalUser();
  return pu?.role === "pastoral";
}
