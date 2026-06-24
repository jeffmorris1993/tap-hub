import Link from "next/link";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import {
  listAnnouncements,
  filterByCategory,
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_COLORS,
  type Announcement,
  type AnnouncementCategory,
} from "../../lib/announcements";

export const revalidate = 60;

type Search = { tab?: string };

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const { tab } = await searchParams;
  const tabs = ["All", ...ANNOUNCEMENT_CATEGORIES] as const;
  const active: (typeof tabs)[number] = tabs.includes(
    (tab ?? "All") as (typeof tabs)[number],
  )
    ? ((tab ?? "All") as (typeof tabs)[number])
    : "All";

  const all = await listAnnouncements();
  const items = filterByCategory(all, active);

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100dvh" }}>
        <BackBar title="Announcements" subtitle="Stay in the loop" />

        {/* Filter tabs */}
        <div
          className="tap-scroll"
          style={{
            padding: "16px 18px 8px",
            display: "flex",
            gap: "8px",
            overflowX: "auto",
          }}
        >
          {tabs.map((t) => {
            const on = t === active;
            const href = t === "All" ? "/announcements" : `/announcements?tab=${encodeURIComponent(t)}`;
            return (
              <Link
                key={t}
                href={href}
                style={{
                  whiteSpace: "nowrap",
                  fontWeight: 800,
                  fontSize: "12.5px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "11px 18px",
                  borderRadius: "10px",
                  textDecoration: "none",
                  background: on ? "#e7b84e" : "#121a2e",
                  color: on ? "#0b101c" : "#cdd3e0",
                  border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
                }}
              >
                {t}
              </Link>
            );
          })}
        </div>

        {/* Cards */}
        <div
          style={{
            padding: "8px 18px 40px",
            display: "flex",
            flexDirection: "column",
            gap: "14px",
          }}
        >
          {items.length === 0 ? (
            <div
              style={{
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "16px",
                padding: "32px 20px",
                textAlign: "center",
                color: "#9aa3b8",
                fontSize: "14px",
              }}
            >
              Nothing here right now. Check back soon.
            </div>
          ) : (
            items.map((a) => <AnnouncementCard key={a.id} a={a} />)
          )}
        </div>
      </div>
    </PhoneShell>
  );
}

function AnnouncementCard({ a }: { a: Announcement }) {
  const accent = ANNOUNCEMENT_COLORS[a.category as AnnouncementCategory];
  return (
    <article
      id={a.id}
      style={{
        scrollMarginTop: "84px",
        background: a.pinned ? "linear-gradient(135deg,#15203a,#101728)" : "#121a2e",
        border: `1px solid ${a.pinned ? "rgba(231,184,78,.32)" : "rgba(244,241,234,.08)"}`,
        borderRadius: "16px",
        padding: "17px 17px 18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "11px",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <span
          style={{
            display: "inline-block",
            background: accent + "22",
            color: accent,
            fontSize: "9.5px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "5px 9px",
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
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#e7b84e",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="#e7b84e" aria-hidden>
              <path d="M14 4l6 6-3 1-3 3-1 5-3-3-5 5 5-5-3-3 5-1 3-3z" />
            </svg>
            Pinned
          </span>
        )}
      </div>

      <h3
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "19px",
          lineHeight: 1.06,
        }}
      >
        {a.title}
      </h3>

      {a.dateLabel && (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            fontSize: "11.5px",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#9aa3b8",
            marginTop: "9px",
          }}
        >
          <svg
            width="13"
            height="13"
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
          {a.dateLabel}
        </div>
      )}

      <p
        style={{
          color: "#cdd3e0",
          fontSize: "14px",
          fontWeight: 500,
          lineHeight: 1.6,
          marginTop: "11px",
          whiteSpace: "pre-wrap",
        }}
      >
        {a.body}
      </p>

      {a.meta && (a.meta.location || a.meta.cost) && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "6px",
            marginTop: "12px",
            paddingTop: "12px",
            borderTop: "1px dashed rgba(244,241,234,.08)",
            fontSize: "12.5px",
            color: "#9aa3b8",
            fontWeight: 600,
          }}
        >
          {a.meta.location && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9aa3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 21s-7-4.5-7-10a7 7 0 1114 0c0 5.5-7 10-7 10z" />
                <circle cx="12" cy="11" r="2.5" />
              </svg>
              {a.meta.location}
            </div>
          )}
          {a.meta.cost && (
            <div style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#9aa3b8"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <circle cx="12" cy="12" r="9" />
                <path d="M9 9c0-1.5 1.4-2.4 3-2.4s3 1 3 2.4-1.4 2.4-3 2.4-3 1-3 2.4 1.4 2.4 3 2.4 3-1 3-2.4M12 4v2.6M12 17.4V20" />
              </svg>
              {a.meta.cost}
            </div>
          )}
        </div>
      )}

      {a.link && (
        <Link
          href={a.link.href}
          {...(a.link.href.startsWith("http") ? { target: "_blank", rel: "noopener noreferrer" } : {})}
          style={{
            marginTop: "15px",
            display: "inline-flex",
            alignItems: "center",
            gap: "6px",
            background: "rgba(231,184,78,.12)",
            color: "#e7b84e",
            border: "1px solid rgba(231,184,78,.35)",
            fontWeight: 800,
            fontSize: "12px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "11px 16px",
            borderRadius: "10px",
            textDecoration: "none",
          }}
        >
          {a.link.label}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M9 6l6 6-6 6" stroke="#e7b84e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </Link>
      )}
    </article>
  );
}
