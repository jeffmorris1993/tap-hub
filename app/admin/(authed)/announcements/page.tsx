import Link from "next/link";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { ANNOUNCEMENT_COLORS, type AnnouncementCategory } from "../../../../lib/announcement-types";
import { ANNOUNCEMENT_FRESH_MS } from "../../../../lib/announcements";
import { fmtDate, fmtDateTime } from "../../../../lib/format";
import type { ApprovalStatus } from "./actions";

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
  approval_status: ApprovalStatus;
};

async function listAllAnnouncements(): Promise<AdminRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("announcements")
    .select(
      "id, category, title, body, date_label, expires_at, pinned, published, created_at, approval_status",
    )
    .order("pinned", { ascending: false })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as AdminRow[];
}

/** Mirrors the public archive rule: explicit expiry passed, or no expiry and
 *  older than the 14-day freshness window. */
function isArchived(r: AdminRow): boolean {
  if (r.expires_at) return new Date(r.expires_at) < new Date();
  return Date.parse(r.created_at) <= Date.now() - ANNOUNCEMENT_FRESH_MS;
}

const STATUS_BADGE: Record<ApprovalStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: "rgba(154,163,184,.18)", color: "#cdd3e0", label: "Draft" },
  pending: { bg: "rgba(231,184,78,.18)", color: "#e7b84e", label: "Pending" },
  approved: { bg: "rgba(78,184,107,.18)", color: "#7ed996", label: "Approved" },
  rejected: { bg: "rgba(181,50,65,.18)", color: "#ff8a8a", label: "Rejected" },
};

const badgeStyle: React.CSSProperties = {
  fontSize: "9.5px",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  padding: "4px 8px",
  borderRadius: "5px",
};

function AnnouncementRow({ r, archived }: { r: AdminRow; archived?: boolean }) {
  const accent = ANNOUNCEMENT_COLORS[r.category];
  const s = STATUS_BADGE[r.approval_status];
  return (
    <Link
      href={`/admin/announcements/${r.id}`}
      style={{
        background: "#121a2e",
        border: `1px solid ${r.pinned && !archived ? "rgba(231,184,78,.3)" : "rgba(244,241,234,.08)"}`,
        borderRadius: "13px",
        padding: "14px 16px",
        textDecoration: "none",
        color: "inherit",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "12px",
        alignItems: "center",
        opacity: archived ? 0.6 : 1,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
          <span style={{ ...badgeStyle, background: accent + "22", color: accent }}>
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
          <span style={{ ...badgeStyle, background: s.bg, color: s.color }}>{s.label}</span>
          {!r.published && r.approval_status === "approved" && (
            <span style={{ ...badgeStyle, background: "rgba(154,163,184,.18)", color: "#cdd3e0" }}>
              Unpublished
            </span>
          )}
          {archived && (
            <span style={{ ...badgeStyle, background: "rgba(154,163,184,.15)", color: "#9aa3b8" }}>
              Archived
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
}

const toggleLinkStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#1a2438",
  color: "#9aa3b8",
  fontWeight: 800,
  fontSize: "12.5px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  padding: "12px 18px",
  borderRadius: "10px",
  textDecoration: "none",
  border: "1px solid rgba(244,241,234,.12)",
};

export default async function AdminAnnouncements({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const [rows, params] = await Promise.all([listAllAnnouncements(), searchParams]);
  const showArchived = params.archived === "1";
  const pendingCount = rows.filter((r) => r.approval_status === "pending").length;

  const archived = rows.filter(isArchived);
  const current = rows.filter((r) => !isArchived(r));

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px", flexWrap: "wrap", gap: "12px" }}>
        <p style={{ color: "#9aa3b8", fontSize: "14px", fontWeight: 600, margin: 0 }}>
          One-off announcements. Event posts are added automatically from approved events.
        </p>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {pendingCount > 0 && (
            <Link
              href="/admin/announcements/pending"
              style={{
                background: "rgba(231,184,78,.14)",
                color: "#e7b84e",
                fontWeight: 800,
                fontSize: "12.5px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "11px 16px",
                borderRadius: "10px",
                textDecoration: "none",
                border: "1px solid rgba(231,184,78,.35)",
              }}
            >
              {pendingCount} pending review →
            </Link>
          )}
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
      </div>

      {current.length === 0 && archived.length === 0 ? (
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
          {current.map((r) => (
            <AnnouncementRow key={r.id} r={r} />
          ))}
          {current.length === 0 && (
            <div style={{ color: "#9aa3b8", fontSize: "13.5px", padding: "8px 2px" }}>
              No current announcements.
            </div>
          )}
        </div>
      )}

      {archived.length > 0 && !showArchived && (
        <div style={{ marginTop: "18px" }}>
          <Link href="/admin/announcements?archived=1" style={toggleLinkStyle}>
            Show archived ({archived.length})
          </Link>
        </div>
      )}

      {archived.length > 0 && showArchived && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "28px 0 12px",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6a738b",
              }}
            >
              Archived
            </span>
            <Link href="/admin/announcements" style={{ ...toggleLinkStyle, padding: "8px 14px" }}>
              Hide archived
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {archived.map((r) => (
              <AnnouncementRow key={r.id} r={r} archived />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
