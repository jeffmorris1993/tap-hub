import Link from "next/link";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import { ANNOUNCEMENT_COLORS, type AnnouncementCategory } from "../../../../../lib/announcement-types";
import { fmtDateTime } from "../../../../../lib/format";
import { currentUserCanApprove } from "../actions";

export const dynamic = "force-dynamic";

type Row = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  date_label: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
};

export default async function PendingAnnouncements() {
  const [{ data, error }, canApprove] = await Promise.all([
    supabaseAdmin()
      .from("announcements")
      .select("id, category, title, body, date_label, submitted_by, submitted_at")
      .eq("approval_status", "pending")
      .order("submitted_at", { ascending: true }),
    currentUserCanApprove(),
  ]);
  if (error) throw error;
  const rows = (data ?? []) as Row[];

  return (
    <div>
      <Link
        href="/admin/announcements"
        style={{ color: "#9aa3b8", fontSize: "12.5px", textDecoration: "none", fontWeight: 700 }}
      >
        ← All announcements
      </Link>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          margin: "10px 0 6px",
        }}
      >
        Pending announcements
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "14px", marginBottom: "22px" }}>
        {canApprove
          ? "Announcements waiting on your review. Open one to approve or reject with notes."
          : "Announcements submitted for review. The Bishop or Assistant Pastor will approve or reject."}
      </p>

      {rows.length === 0 ? (
        <div
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "14px",
            padding: "44px 22px",
            textAlign: "center",
            color: "#9aa3b8",
            fontSize: "14px",
          }}
        >
          Nothing waiting. Inbox zero.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rows.map((r) => {
            const accent = ANNOUNCEMENT_COLORS[r.category];
            return (
              <Link
                key={r.id}
                href={`/admin/announcements/${r.id}`}
                style={{
                  background: "#121a2e",
                  border: "1px solid rgba(231,184,78,.25)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  textDecoration: "none",
                  color: "inherit",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                    <span
                      style={{
                        background: accent + "22",
                        color: accent,
                        fontSize: "9.5px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        padding: "4px 8px",
                        borderRadius: "5px",
                      }}
                    >
                      {r.category}
                    </span>
                    <div
                      style={{
                        fontFamily: "var(--font-anton)",
                        fontWeight: 400,
                        textTransform: "uppercase",
                        fontSize: "18px",
                        lineHeight: 1.04,
                      }}
                    >
                      {r.title}
                    </div>
                  </div>
                  {r.date_label && (
                    <div style={{ color: "#9aa3b8", fontSize: "12.5px", marginTop: "6px", fontWeight: 600 }}>
                      {r.date_label}
                    </div>
                  )}
                  {r.submitted_by && (
                    <div style={{ color: "#6a738b", fontSize: "12px", marginTop: "4px" }}>
                      Submitted by {r.submitted_by}
                      {r.submitted_at ? ` · ${fmtDateTime(r.submitted_at)}` : ""}
                    </div>
                  )}
                </div>
                <span
                  style={{
                    color: "#e7b84e",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.05em",
                    textTransform: "uppercase",
                  }}
                >
                  Review →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
