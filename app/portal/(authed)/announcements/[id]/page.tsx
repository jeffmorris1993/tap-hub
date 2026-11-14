import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import type { AnnouncementCategory } from "../../../../../lib/announcement-types";
import { AnnouncementForm } from "../AnnouncementForm";
import { currentUserCanApprove, type ApprovalStatus } from "../actions";
import { listLinkableEvents } from "../../../../../lib/event-picker";
import { requireLead } from "../../../../../lib/portal-auth";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  date_label: string | null;
  expires_at: string | null;
  pinned: boolean;
  published: boolean;
  link_url: string | null;
  action_label: string | null;
  approval_status: ApprovalStatus;
  approval_notes: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  kind: "standard" | "poll";
  hero: boolean;
  poll_closes_at: string | null;
  poll_notify_emails: string[] | null;
  poll_results_sent_at: string | null;
};

const FIELDS =
  "id, category, title, body, date_label, expires_at, pinned, published, link_url, action_label, " +
  "approval_status, approval_notes, submitted_by, reviewed_by, " +
  "kind, hero, poll_closes_at, poll_notify_emails, poll_results_sent_at";

export default async function EditAnnouncement({ params }: { params: Promise<{ id: string }> }) {
  const pu = await requireLead();
  const { id } = await params;
  const [{ data, error }, canApprove, events] = await Promise.all([
    supabaseAdmin().from("announcements").select(FIELDS).eq("id", id).limit(1),
    currentUserCanApprove(),
    listLinkableEvents(),
  ]);
  if (error) throw error;
  const row = (data?.[0] ?? null) as unknown as Row | null;
  if (!row) notFound();
  // A lead can only open announcements for their own ministries (General
  // announcements are visible on the list but managed by pastoral).
  if (pu.role !== "pastoral" && !pu.ministries.includes(row.category)) notFound();

  let pollOptions: string[] | undefined;
  let pollVoteCount = 0;
  if (row.kind === "poll") {
    const sb = supabaseAdmin();
    const [optRes, voteRes] = await Promise.all([
      sb
        .from("poll_options")
        .select("label, position")
        .eq("announcement_id", row.id)
        .order("position", { ascending: true }),
      sb.from("poll_votes").select("id", { count: "exact", head: true }).eq("announcement_id", row.id),
    ]);
    pollOptions = ((optRes.data ?? []) as { label: string }[]).map((o) => o.label);
    pollVoteCount = voteRes.count ?? 0;
  }

  return (
    <div>
      <Link
        href="/portal/announcements"
        style={{ color: "#9aa3b8", fontSize: "12.5px", textDecoration: "none", fontWeight: 700 }}
      >
        ← All announcements
      </Link>
      <div style={{ marginTop: "16px" }}>
        <AnnouncementForm
          initial={row}
          canApprove={canApprove}
          events={events}
          allowedCategories={pu.role === "pastoral" ? undefined : pu.ministries}
          pollOptions={pollOptions}
          pollVoteCount={pollVoteCount}
        />
      </div>
    </div>
  );
}
