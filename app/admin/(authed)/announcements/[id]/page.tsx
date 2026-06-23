import Link from "next/link";
import { notFound } from "next/navigation";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import type { AnnouncementCategory } from "../../../../../lib/announcements";
import { AnnouncementForm } from "../AnnouncementForm";

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
};

export default async function EditAnnouncement({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { data, error } = await supabaseAdmin()
    .from("announcements")
    .select("id, category, title, body, date_label, expires_at, pinned, published, link_url, action_label")
    .eq("id", id)
    .limit(1);
  if (error) throw error;
  const row = (data?.[0] ?? null) as Row | null;
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
        <AnnouncementForm initial={row} />
      </div>
    </div>
  );
}
