"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { isApprover, getApproverEmails } from "../../../../lib/approvers";
import { recurrenceLabel } from "../../../../lib/events-occurrence";
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

export type EventFormInput = {
  id?: string;
  slug: string;
  title: string;
  description_long: string;
  category: "Worship" | "Youth" | "Community";
  /** ISO datetime-local string (e.g. "2026-04-05T12:00") in local time. */
  starts_at_local: string;
  ends_at_local: string;
  location: string;
  cost: string | null;
  allow_volunteers: boolean;
  recurrence_kind: "none" | "weekly" | "biweekly" | "monthly";
  recurrence_byday: number | null;
  recurrence_until: string | null;
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

function toIso(localValue: string): string | null {
  if (!localValue) return null;
  const d = new Date(localValue);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function requireAdmin(): Promise<{ email: string }> {
  const user = await getAdminUser();
  if (!user) throw new Error("Not authorized");
  return { email: user.email ?? "(unknown)" };
}

function revalidateAllEventSurfaces(slug?: string) {
  revalidatePath("/events");
  if (slug) revalidatePath(`/events/${slug}`);
  revalidatePath("/today");
  revalidatePath("/");
  revalidatePath("/admin/events");
  revalidatePath("/admin/events/pending");
  revalidatePath("/admin");
}

/** Save edits without changing approval status. Approver-only changes (e.g.
 *  flipping published on an approved event) go through approve/reject paths. */
export async function saveEvent(input: EventFormInput): Promise<EventActionResult> {
  await requireAdmin();
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

  const payload = {
    slug: slugify(slug),
    title,
    description_long,
    category: input.category,
    starts_at,
    ends_at,
    location,
    allow_volunteers: input.allow_volunteers,
    cost: input.cost?.trim() ? input.cost.trim() : null,
    recurrence_kind: input.recurrence_kind,
    recurrence_byday: input.recurrence_kind === "weekly" || input.recurrence_kind === "biweekly"
      ? input.recurrence_byday
      : null,
    recurrence_until: input.recurrence_until || null,
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
  const row = data[0] as unknown as EventSnapshot & { recurrence_kind: "none" | "weekly" | "biweekly" | "monthly" };
  return { ...row, recurrence_label: recurrenceLabel(row.recurrence_kind) };
}

export async function submitForApproval(id: string): Promise<EventActionResult> {
  const { email } = await requireAdmin();
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
    const approvers = getApproverEmails();
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

export async function approveEvent(id: string): Promise<EventActionResult> {
  const { email } = await requireAdmin();
  if (!isApprover(email)) return { ok: false, error: "You are not an approver." };
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
  const { email } = await requireAdmin();
  if (!isApprover(email)) return { ok: false, error: "You are not an approver." };
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
  const { email } = await requireAdmin();
  if (!isApprover(email)) throw new Error("Only approvers can delete events.");
  const sb = supabaseAdmin();
  const { error } = await sb.from("events").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidateAllEventSurfaces();
  redirect("/admin/events");
}

export async function unpublishEvent(id: string): Promise<EventActionResult> {
  const { email } = await requireAdmin();
  if (!isApprover(email)) return { ok: false, error: "You are not an approver." };
  const { error } = await supabaseAdmin().from("events").update({ published: false }).eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidateAllEventSurfaces();
  return { ok: true, id };
}

export async function republishEvent(id: string): Promise<EventActionResult> {
  const { email } = await requireAdmin();
  if (!isApprover(email)) return { ok: false, error: "You are not an approver." };
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

/** Returns true if the current admin can approve/reject events. */
export async function currentUserCanApprove(): Promise<boolean> {
  const user = await getAdminUser();
  return isApprover(user?.email);
}
