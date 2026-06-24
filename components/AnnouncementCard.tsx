import Link from "next/link";
import { ANNOUNCEMENT_COLORS, type AnnouncementCategory } from "../lib/announcement-types";
import type { Announcement } from "../lib/announcements";

function truncate(s: string, max: number): string {
  const trimmed = s.trim();
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

/** List-view card: title + truncated body + tap-through. The full body,
 *  meta, and action button live on the detail page. */
export function AnnouncementListCard({ a }: { a: Announcement }) {
  const accent = ANNOUNCEMENT_COLORS[a.category as AnnouncementCategory];
  return (
    <Link
      href={a.href}
      style={{
        display: "block",
        background: a.pinned ? "linear-gradient(135deg,#15203a,#101728)" : "#121a2e",
        border: `1px solid ${a.pinned ? "rgba(231,184,78,.32)" : "rgba(244,241,234,.08)"}`,
        borderRadius: "16px",
        padding: "17px 17px 18px",
        textDecoration: "none",
        color: "inherit",
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
          lineHeight: 1.5,
          marginTop: "11px",
        }}
      >
        {truncate(a.body, 160)}
      </p>

      <div
        style={{
          marginTop: "14px",
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          color: "#e7b84e",
          fontSize: "11.5px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        Read more
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path
            d="M9 6l6 6-6 6"
            stroke="#e7b84e"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </Link>
  );
}
