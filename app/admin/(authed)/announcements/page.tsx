import Link from "next/link";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { ANNOUNCEMENT_COLORS, type AnnouncementCategory } from "../../../../lib/announcements";
import { fmtDate, fmtDateTime } from "../../../../lib/format";

export const dynamic = "force-dynamic";

type AdminRow = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  date_label: string | null;
  expires_at: string | null;
  pinned: boolean;
  published: boolean;
  created_at: string;
};

async function listAllAnnouncements(): Promise<AdminRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("announcements")
    .select("id, category, title, body, date_label, expires_at, pinned, published, created_at")
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminRow[];
}

export default async function AdminAnnouncements() {
  const rows = await listAllAnnouncements();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
        <p style={{ color: "#9aa3b8", fontSize: "14px", fontWeight: 600 }}>
          One-off announcements. Event posts are added automatically from approved events.
        </p>
        <Link
          href="/admin/announcements/new"
          style={{
            background: "#e7b84e",
            color: "#0b101c",
            fontWeight: 800,
            fontSize: "12.5px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "11px 18px",
            borderRadius: "10px",
            textDecoration: "none",
            whiteSpace: "nowrap",
          }}
        >
          New announcement
        </Link>
      </div>

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
          No announcements yet. Create your first one.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rows.map((r) => {
            const accent = ANNOUNCEMENT_COLORS[r.category];
            const expired = r.expires_at && new Date(r.expires_at) < new Date();
            return (
              <Link
                key={r.id}
                href={`/admin/announcements/${r.id}`}
                style={{
                  background: "#121a2e",
                  border: `1px solid ${r.pinned ? "rgba(231,184,78,.3)" : "rgba(244,241,234,.08)"}`,
                  borderRadius: "13px",
                  padding: "14px 16px",
                  textDecoration: "none",
                  color: "inherit",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "12px",
                  alignItems: "center",
                }}
              >
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
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
                    {r.pinned && (
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "#e7b84e",
                        }}
                      >
                        ★ Pinned
                      </span>
                    )}
                    {!r.published && (
                      <span
                        style={{
                          background: "rgba(154,163,184,.18)",
                          color: "#cdd3e0",
                          fontSize: "9.5px",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "4px 8px",
                          borderRadius: "5px",
                        }}
                      >
                        Draft
                      </span>
                    )}
                    {expired && (
                      <span
                        style={{
                          background: "rgba(181,50,65,.18)",
                          color: "#ff8a8a",
                          fontSize: "9.5px",
                          fontWeight: 800,
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          padding: "4px 8px",
                          borderRadius: "5px",
                        }}
                      >
                        Expired
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-anton)",
                      fontWeight: 400,
                      textTransform: "uppercase",
                      fontSize: "18px",
                      lineHeight: 1.04,
                      marginTop: "6px",
                    }}
                  >
                    {r.title}
                  </div>
                  <div style={{ color: "#9aa3b8", fontSize: "12.5px", marginTop: "4px", fontWeight: 600 }}>
                    {r.date_label ? `${r.date_label} · ` : ""}Posted {fmtDateTime(r.created_at)}
                    {r.expires_at ? ` · auto-hides ${fmtDate(r.expires_at)}` : ""}
                  </div>
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
                  Edit →
                </span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
