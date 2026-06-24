import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import type { AnnouncementCategory } from "../../../../../lib/announcement-types";
import { AnnouncementForm } from "../AnnouncementForm";
import { currentUserCanApprove, type ApprovalStatus } from "../actions";
import { listLinkableEvents } from "../../../../../lib/event-picker";

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
};

const FIELDS =
  "id, category, title, body, date_label, expires_at, pinned, published, link_url, action_label, " +
  "approval_status, approval_notes, submitted_by, reviewed_by";

export default async function EditAnnouncement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [{ data, error }, canApprove, events] = await Promise.all([
    supabaseAdmin().from("announcements").select(FIELDS).eq("id", id).limit(1),
    currentUserCanApprove(),
    listLinkableEvents(),
  ]);
  if (error) throw error;
  const row = (data?.[0] ?? null) as unknown as Row | null;
  if (!row) notFound();

  return (
    <div>
      <Link
        href="/admin/announcements"
        style={{ color: "#9aa3b8", fontSize: "12.5px", textDecoration: "none", fontWeight: 700 }}
      >
        ← All announcements
      </Link>
      <div style={{ marginTop: "16px" }}>
        <AnnouncementForm initial={row} canApprove={canApprove} events={events} />
      </div>
    </div>
  );
}
