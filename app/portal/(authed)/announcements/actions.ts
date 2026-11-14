"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertLead, getPortalUser, type PortalUser } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { listApproverEmails } from "../../../../lib/approvers";
import type { AnnouncementCategory } from "../../../../lib/announcement-types";
import {
  notifyApproversOfAnnouncementSubmission,
  notifySubmitterOfAnnouncementApproval,
  notifySubmitterOfAnnouncementRejection,
  type AnnouncementSnapshot,
} from "../../../../lib/email/announcement-approval";
import {
  pushAnnouncementSubmissionToApprovers,
  pushAnnouncementApprovalToSubmitter,
  pushAnnouncementRejectionToSubmitter,
} from "../../../../lib/chat-notifications";
import { localToUtcIso } from "../../../../lib/tz";
import { parseNotifyEmails } from "../../../../lib/event-notify";
import { maybeSendPollResults } from "../../../../lib/polls";

const SNAPSHOT_FIELDS = "id, category, title, body, date_label";

async function snapshot(id: string): Promise<AnnouncementSnapshot | null> {
  const { data, error } = await supabaseAdmin()
    .from("announcements")
    .select(SNAPSHOT_FIELDS)
    .eq("id", id)
    .limit(1);
  if (error || !data?.[0]) return null;
  return data[0] as unknown as AnnouncementSnapshot;
}

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export type AnnouncementInput = {
  id?: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  date_label: string | null;
  expires_at: string | null;
  pinned: boolean;
  link_url: string | null;
  action_label: string | null;
  // Poll + hero fields are optional so other callers (agent tools) that only
  // know the base shape keep working — omitted means "standard announcement".
  kind?: "standard" | "poll";
  /** Homepage hero slot — pastoral-only; stripped for other roles. */
  hero?: boolean;
  /** Voting close time as a datetime-local string (Detroit wall clock). */
  poll_closes_at_local?: string | null;
  /** Option labels in display order. */
  poll_options?: string[];
  /** Free-text watchers box; validated with parseNotifyEmails. */
  poll_notify_emails_raw?: string | null;
};

export type AnnouncementResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/** Announcements are staff surfaces: lead (scoped) or pastoral. */
async function requireStaff(): Promise<PortalUser> {
  return assertLead();
}

/** Leads may only create/edit announcements for their own ministries. */
function inScope(pu: PortalUser, category: string): boolean {
  return pu.role === "pastoral" || pu.ministries.includes(category);
}

type ExistingRow = {
  category: string;
  approval_status: string;
  kind: "standard" | "poll";
  hero: boolean;
  poll_closes_at: string | null;
};

async function loadExisting(id: string): Promise<ExistingRow | null> {
  const { data } = await supabaseAdmin()
    .from("announcements")
    .select("category, approval_status, kind, hero, poll_closes_at")
    .eq("id", id)
    .limit(1);
  return (data?.[0] as ExistingRow | undefined) ?? null;
}

async function pollVoteCount(id: string): Promise<number> {
  const { count } = await supabaseAdmin()
    .from("poll_votes")
    .select("id", { count: "exact", head: true })
    .eq("announcement_id", id);
  return count ?? 0;
}

async function listOptionLabels(id: string): Promise<string[]> {
  const { data } = await supabaseAdmin()
    .from("poll_options")
    .select("label, position")
    .eq("announcement_id", id)
    .order("position", { ascending: true });
  return ((data ?? []) as { label: string }[]).map((o) => o.label);
}

function bustCaches() {
  revalidatePath("/announcements");
  revalidatePath("/");
  revalidatePath("/portal/announcements");
}

/** Save (insert or update) without changing the approval state.
 *  - Brand-new announcements are saved as drafts; submit-for-approval is a separate action.
 *  - Edits to an existing announcement preserve its approval_status. */
export async function saveAnnouncement(input: AnnouncementInput): Promise<AnnouncementResult> {
  let pu: PortalUser;
  try {
    pu = await requireStaff();
  } catch {
    return { ok: false, error: "Not authorized." };
  }
  if (!inScope(pu, input.category)) {
    return { ok: false, error: `You can only post ${pu.ministries.join(", ") || "your ministry's"} announcements.` };
  }
  const existing = input.id ? await loadExisting(input.id) : null;
  if (input.id) {
    if (existing && !inScope(pu, existing.category)) {
      return { ok: false, error: "That announcement belongs to another ministry." };
    }
    if (existing?.approval_status === "pending" && pu.role !== "pastoral") {
      return {
        ok: false,
        error: "This announcement is awaiting review and can't be edited. A pastor can approve it, or reject it with notes to unlock edits.",
      };
    }
  }

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Body is required." };
  const dateLabel = input.date_label?.trim() || null;
  const linkUrl = input.link_url?.trim() || null;
  const actionLabel = input.action_label?.trim() || null;
  if (linkUrl && !actionLabel) {
    return { ok: false, error: "Add a label for the action button (or remove the link)." };
  }

  const kind: "standard" | "poll" = input.kind === "poll" ? "poll" : "standard";
  // Hero is a pastoral-only call (homepage real estate). Non-pastoral edits
  // preserve whatever a pastor already set rather than silently clearing it.
  const hero = pu.role === "pastoral" ? !!input.hero : (existing?.hero ?? false);

  const votes = input.id && existing?.kind === "poll" ? await pollVoteCount(input.id) : 0;
  if (existing?.kind === "poll" && kind === "standard" && votes > 0) {
    return { ok: false, error: "This poll already has votes, so it can't be turned back into a standard announcement." };
  }

  let pollClosesAt: string | null = null;
  let pollNotifyEmails: string[] | null = null;
  let pollLabels: string[] = [];
  let expiresAt = input.expires_at;

  if (kind === "poll") {
    pollLabels = (input.poll_options ?? []).map((l) => l.trim()).filter(Boolean);
    if (pollLabels.length < 2) return { ok: false, error: "A poll needs at least 2 options." };
    if (pollLabels.length > 8) return { ok: false, error: "A poll can have at most 8 options." };
    const seen = new Set(pollLabels.map((l) => l.toLowerCase()));
    if (seen.size !== pollLabels.length) {
      return { ok: false, error: "Poll options must be unique." };
    }

    pollClosesAt = input.poll_closes_at_local ? localToUtcIso(input.poll_closes_at_local) : null;
    if (!pollClosesAt) return { ok: false, error: "Set when voting closes." };
    const closeChanged =
      !existing?.poll_closes_at || Date.parse(existing.poll_closes_at) !== Date.parse(pollClosesAt);
    if (closeChanged && Date.parse(pollClosesAt) <= Date.now()) {
      return { ok: false, error: "The voting close time must be in the future." };
    }

    const { emails, invalid } = parseNotifyEmails(input.poll_notify_emails_raw);
    if (invalid.length > 0) {
      return { ok: false, error: `These don't look like email addresses: ${invalid.join(", ")}` };
    }
    pollNotifyEmails = emails.length > 0 ? emails : null;

    // Options are locked the moment the first vote lands — a changed option
    // list would orphan or misattribute votes.
    if (votes > 0) {
      const current = await listOptionLabels(input.id as string);
      const same =
        current.length === pollLabels.length && current.every((l, i) => l === pollLabels[i]);
      if (!same) {
        return {
          ok: false,
          error: `Poll options are locked — ${votes} ${votes === 1 ? "vote has" : "votes have"} already been cast. You can still edit the title, body, and close time.`,
        };
      }
    }

    // Closed polls should linger showing results, then archive: default the
    // auto-hide to a week after voting closes when none was chosen.
    if (!expiresAt) {
      expiresAt = new Date(Date.parse(pollClosesAt) + 7 * 24 * 60 * 60 * 1000).toISOString();
    }
  }

  const baseFields = {
    category: input.category,
    title,
    body,
    date_label: dateLabel,
    expires_at: expiresAt,
    pinned: input.pinned,
    link_url: linkUrl,
    action_label: actionLabel,
    kind,
    hero,
    poll_closes_at: pollClosesAt,
    poll_notify_emails: pollNotifyEmails,
  };

  const sb = supabaseAdmin();
  let rowId: string;
  if (input.id) {
    const { error } = await sb.from("announcements").update(baseFields).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    rowId = input.id;
  } else {
    // New row → save as draft, unpublished. The user moves it forward
    // explicitly with "Submit for approval" / "Publish".
    const { data, error } = await sb
      .from("announcements")
      .insert({
        ...baseFields,
        approval_status: "draft",
        published: false,
        submitted_by: pu.email || null,
      })
      .select("id")
      .single();
    if (error) return { ok: false, error: error.message };
    rowId = (data as { id: string }).id;
  }

  // Rewrite the option rows while that's still safe (no votes reference
  // them). With votes present the list was validated unchanged above.
  if (votes === 0) {
    const { error: delErr } = await sb.from("poll_options").delete().eq("announcement_id", rowId);
    if (delErr) return { ok: false, error: delErr.message };
    if (kind === "poll") {
      const { error: insErr } = await sb.from("poll_options").insert(
        pollLabels.map((label, position) => ({ announcement_id: rowId, label, position })),
      );
      if (insErr) return { ok: false, error: insErr.message };
    }
  }

  bustCaches();
  return { ok: true, id: rowId };
}

/** Move a draft / rejected announcement to pending. Approvers' announcements
 *  skip the queue and publish immediately (matches the events flow). */
export async function submitAnnouncementForApproval(id: string): Promise<AnnouncementResult> {
  let pu: PortalUser;
  try {
    pu = await requireStaff();
  } catch {
    return { ok: false, error: "Not authorized." };
  }
  const email = pu.email;
  const existing = await loadExisting(id);
  if (existing && !inScope(pu, existing.category)) {
    return { ok: false, error: "That announcement belongs to another ministry." };
  }
  if (
    existing?.kind === "poll" &&
    existing.poll_closes_at &&
    Date.parse(existing.poll_closes_at) <= Date.now()
  ) {
    return { ok: false, error: "This poll's voting window has already ended — update the close time first." };
  }
  const senderIsApprover = pu.role === "pastoral";
  const nowIso = new Date().toISOString();

  const payload = senderIsApprover
    ? {
        approval_status: "approved" as const,
        submitted_by: email,
        submitted_at: nowIso,
        reviewed_by: email,
        reviewed_at: nowIso,
        approval_notes: null,
        published: true,
      }
    : {
        approval_status: "pending" as const,
        submitted_by: email,
        submitted_at: nowIso,
        reviewed_by: null,
        reviewed_at: null,
        approval_notes: null,
        published: false,
      };

  const { error } = await supabaseAdmin().from("announcements").update(payload).eq("id", id);
  if (error) return { ok: false, error: error.message };
  bustCaches();

  // Notify approvers when a non-approver submits (matches the events flow).
  if (!senderIsApprover) {
    const snap = await snapshot(id);
    if (snap) {
      const approvers = await listApproverEmails();
      await Promise.all([
        notifyApproversOfAnnouncementSubmission(snap, email, approvers),
        pushAnnouncementSubmissionToApprovers(
          { id: snap.id, category: snap.category, title: snap.title, date_label: snap.date_label },
          email,
          approvers,
        ),
      ]);
    }
  }

  return { ok: true, id };
}

export async function approveAnnouncement(id: string): Promise<AnnouncementResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") {
    return { ok: false, error: "Only pastoral leadership can approve announcements." };
  }
  const user = { email: pu.email };

  const existing = await loadExisting(id);
  if (
    existing?.kind === "poll" &&
    existing.poll_closes_at &&
    Date.parse(existing.poll_closes_at) <= Date.now()
  ) {
    return { ok: false, error: "This poll's voting window has already ended — have the close time updated before approving." };
  }

  // Pull the submitter before the update so we know whom to notify.
  const { data: pre } = await supabaseAdmin()
    .from("announcements")
    .select("submitted_by")
    .eq("id", id)
    .limit(1);
  const submittedBy = (pre?.[0] as { submitted_by: string | null } | undefined)?.submitted_by ?? null;

  const { error } = await supabaseAdmin()
    .from("announcements")
    .update({
      approval_status: "approved",
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
      approval_notes: null,
      published: true,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  bustCaches();

  if (submittedBy && submittedBy !== user.email) {
    const snap = await snapshot(id);
    if (snap) {
      await Promise.all([
        notifySubmitterOfAnnouncementApproval(snap, submittedBy, user.email ?? "admin"),
        pushAnnouncementApprovalToSubmitter(
          { id: snap.id, category: snap.category, title: snap.title, date_label: snap.date_label },
          submittedBy,
          user.email ?? "admin",
        ),
      ]);
    }
  }
  return { ok: true, id };
}

export async function rejectAnnouncement(id: string, notes: string): Promise<AnnouncementResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") {
    return { ok: false, error: "Only pastoral leadership can reject announcements." };
  }
  const user = { email: pu.email };
  const trimmed = notes.trim();
  if (!trimmed) return { ok: false, error: "Add a short note about what needs to change." };

  const { data: pre } = await supabaseAdmin()
    .from("announcements")
    .select("submitted_by")
    .eq("id", id)
    .limit(1);
  const submittedBy = (pre?.[0] as { submitted_by: string | null } | undefined)?.submitted_by ?? null;

  const { error } = await supabaseAdmin()
    .from("announcements")
    .update({
      approval_status: "rejected",
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
      approval_notes: trimmed,
      published: false,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  bustCaches();

  if (submittedBy && submittedBy !== user.email) {
    const snap = await snapshot(id);
    if (snap) {
      await Promise.all([
        notifySubmitterOfAnnouncementRejection(snap, submittedBy, user.email ?? "admin", trimmed),
        pushAnnouncementRejectionToSubmitter(
          { id: snap.id, category: snap.category, title: snap.title, date_label: snap.date_label },
          submittedBy,
          user.email ?? "admin",
          trimmed,
        ),
      ]);
    }
  }
  return { ok: true, id };
}

export async function unpublishAnnouncement(id: string): Promise<AnnouncementResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") {
    return { ok: false, error: "Only pastoral leadership can unpublish announcements." };
  }
  const { error } = await supabaseAdmin()
    .from("announcements")
    .update({ published: false })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  bustCaches();
  return { ok: true, id };
}

export async function republishAnnouncement(id: string): Promise<AnnouncementResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") {
    return { ok: false, error: "Only pastoral leadership can republish announcements." };
  }
  const { error } = await supabaseAdmin()
    .from("announcements")
    .update({ published: true })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  bustCaches();
  return { ok: true, id };
}

export async function deleteAnnouncement(id: string): Promise<void> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") throw new Error("Only pastoral leadership can delete announcements.");
  const sb = supabaseAdmin();
  const { error } = await sb.from("announcements").delete().eq("id", id);
  if (error) throw error;
  bustCaches();
  redirect("/portal/announcements");
}

export async function currentUserCanApprove(): Promise<boolean> {
  const pu = await getPortalUser();
  return pu?.role === "pastoral";
}

/** Manual "send the results email now" — creator or pastoral, closed polls
 *  only. Safe to click twice: the claim inside maybeSendPollResults is
 *  send-once. */
export async function sendPollResultsNow(id: string): Promise<AnnouncementResult> {
  const pu = await getPortalUser();
  if (!pu) return { ok: false, error: "Not authorized." };

  const { data } = await supabaseAdmin()
    .from("announcements")
    .select("kind, submitted_by, poll_closes_at, poll_results_sent_at")
    .eq("id", id)
    .limit(1);
  const row = data?.[0] as
    | { kind: string; submitted_by: string | null; poll_closes_at: string | null; poll_results_sent_at: string | null }
    | undefined;
  if (!row || row.kind !== "poll") return { ok: false, error: "That announcement isn't a poll." };
  if (pu.role !== "pastoral" && pu.email !== row.submitted_by) {
    return { ok: false, error: "Only the poll's creator or pastoral leadership can send results." };
  }
  if (!row.poll_closes_at || Date.parse(row.poll_closes_at) > Date.now()) {
    return { ok: false, error: "The poll hasn't closed yet." };
  }
  if (row.poll_results_sent_at) {
    return { ok: false, error: "Results were already sent." };
  }
  const sent = await maybeSendPollResults(id);
  return sent ? { ok: true, id } : { ok: false, error: "Results were already sent." };
}
