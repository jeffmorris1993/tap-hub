import Link from "next/link";
import {
  listAnnouncements,
  ANNOUNCEMENT_COLORS,
  type Announcement,
} from "../lib/announcements";

export async function HubAnnouncements() {
  const all = await listAnnouncements();
  // Pinned first (already sorted by listAnnouncements), then the next few
  // upcoming. Cap at 4 for the strip.
  const preview = all.slice(0, 4);
  if (preview.length === 0) return null;

  return (
    <div style={{ padding: "24px 20px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "13px",
        }}
      >
        <span
          style={{
            fontSize: "11.5px",
            fontWeight: 800,
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "#6a738b",
          }}
        >
          Announcements
        </span>
        <Link
          href="/announcements"
          style={{
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#e7b84e",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          See all
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M9 6l6 6-6 6"
              stroke="#e7b84e"
              strokeWidth="2.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
      </div>

      <div
        className="tap-scroll"
        style={{
          display: "flex",
          gap: "12px",
          overflowX: "auto",
          paddingBottom: "2px",
          // negative side padding so cards bleed to the edge of the phone
          // column when the strip scrolls
          marginLeft: "-20px",
          marginRight: "-20px",
          paddingLeft: "20px",
          paddingRight: "20px",
          scrollSnapType: "x mandatory",
        }}
      >
        {preview.map((a) => (
          <PreviewCard key={a.id} a={a} />
        ))}
      </div>
    </div>
  );
}

function PreviewCard({ a }: { a: Announcement }) {
  const accent = ANNOUNCEMENT_COLORS[a.category];
  return (
    <Link
      href="/announcements"
      style={{
        flexShrink: 0,
        width: "246px",
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "15px",
        padding: "15px 16px",
        textDecoration: "none",
        color: "inherit",
        scrollSnapAlign: "start",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
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
              gap: "4px",
              fontSize: "9px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#e7b84e",
            }}
          >
            <svg width="11" height="11" viewBox="0 0 24 24" fill="#e7b84e" aria-hidden>
              <path d="M14 4l6 6-3 1-3 3-1 5-3-3-5 5 5-5-3-3 5-1 3-3z" />
            </svg>
            Pinned
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "16.5px",
          lineHeight: 1.08,
          marginTop: "10px",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}
      >
        {a.title}
      </div>
      {a.dateLabel && (
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            color: "#9aa3b8",
            marginTop: "8px",
          }}
        >
          {a.dateLabel}
        </div>
      )}
    </Link>
  );
}
