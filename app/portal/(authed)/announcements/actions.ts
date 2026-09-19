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

async function announcementCategory(id: string): Promise<string | null> {
  const { data } = await supabaseAdmin().from("announcements").select("category").eq("id", id).limit(1);
  return (data?.[0] as { category?: string } | undefined)?.category ?? null;
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
  if (input.id) {
    const existing = await announcementCategory(input.id);
    if (existing && !inScope(pu, existing)) {
      return { ok: false, error: "That announcement belongs to another ministry." };
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

  const baseFields = {
    category: input.category,
    title,
    body,
    date_label: dateLabel,
    expires_at: input.expires_at,
    pinned: input.pinned,
    link_url: linkUrl,
    action_label: actionLabel,
  };

  const sb = supabaseAdmin();
  if (input.id) {
    const { error } = await sb.from("announcements").update(baseFields).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    bustCaches();
    return { ok: true, id: input.id };
  }

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
  bustCaches();
  return { ok: true, id: (data as { id: string }).id };
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
  const category = await announcementCategory(id);
  if (category && !inScope(pu, category)) {
    return { ok: false, error: "That announcement belongs to another ministry." };
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
