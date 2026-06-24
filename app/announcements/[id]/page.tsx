import Link from "next/link";
import { notFound } from "next/navigation";
import { PhoneShell } from "../../../components/PhoneShell";
import { BackBar } from "../../../components/BackBar";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { ANNOUNCEMENT_COLORS, type AnnouncementCategory } from "../../../lib/announcement-types";

export const revalidate = 60;

type Row = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  date_label: string | null;
  expires_at: string | null;
  pinned: boolean;
  link_url: string | null;
  action_label: string | null;
};

export default async function AnnouncementDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // The id is a UUID; reject anything that doesn't look like one so we
  // don't even hit the DB for garbage paths.
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("announcements")
    .select("id, category, title, body, date_label, expires_at, pinned, link_url, action_label")
    .eq("id", id)
    .eq("published", true)
    .eq("approval_status", "approved")
    .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
    .limit(1);
  if (error) throw error;
  const a = (data?.[0] ?? null) as Row | null;
  if (!a) notFound();

  const accent = ANNOUNCEMENT_COLORS[a.category];

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100dvh" }}>
        <BackBar href="/announcements" title="Announcement" subtitle="Stay in the loop" />

        <article style={{ padding: "20px 18px 40px" }}>
          {/* Category + pinned indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "14px",
              flexWrap: "wrap",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background: accent + "22",
                color: accent,
                fontSize: "10px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "6px 11px",
                borderRadius: "6px",
              }}
            >
              {a.category}
            </span>
            {a.pinned && (
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "5px",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#e7b84e",
                }}
              >
                <svg width="13" height="13" viewBox="0 0 24 24" fill="#e7b84e" aria-hidden>
                  <path d="M14 4l6 6-3 1-3 3-1 5-3-3-5 5 5-5-3-3 5-1 3-3z" />
                </svg>
                Pinned
              </span>
            )}
          </div>

          <h1
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "28px",
              lineHeight: 1.04,
            }}
          >
            {a.title}
          </h1>

          {a.date_label && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                fontSize: "12.5px",
                fontWeight: 800,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                color: "#9aa3b8",
                marginTop: "12px",
              }}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9aa3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <rect x="4" y="5" width="16" height="16" rx="2.5" />
                <path d="M4 9.5h16M8 3v4M16 3v4" />
              </svg>
              {a.date_label}
            </div>
          )}

          <p
            style={{
              color: "#cdd3e0",
              fontSize: "15px",
              fontWeight: 500,
              lineHeight: 1.65,
              marginTop: "16px",
              whiteSpace: "pre-wrap",
            }}
          >
            {a.body}
          </p>

          {a.link_url && (
            <Link
              href={a.link_url}
              {...(a.link_url.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
              style={{
                marginTop: "24px",
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "#e7b84e",
                color: "#0b101c",
                border: "none",
                fontWeight: 800,
                fontSize: "13.5px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "14px 22px",
                borderRadius: "12px",
                textDecoration: "none",
              }}
            >
              {a.action_label ?? "Learn more"}
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M9 6l6 6-6 6"
                  stroke="#0b101c"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          )}

          <div
            style={{
              marginTop: "32px",
              paddingTop: "20px",
              borderTop: "1px solid rgba(244,241,234,.06)",
              textAlign: "center",
            }}
          >
            <Link
              href="/announcements"
              style={{
                color: "#e7b84e",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                textDecoration: "none",
              }}
            >
              ← All announcements
            </Link>
          </div>
        </article>
      </div>
    </PhoneShell>
  );
}
