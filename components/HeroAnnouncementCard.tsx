import Link from "next/link";
import { ANNOUNCEMENT_COLORS } from "../lib/announcement-types";
import type { HeroAnnouncement } from "../lib/announcements";

/**
 * The homepage hero slot for a featured announcement — the same placement the
 * Ignite Parent Card uses, in the hub's own gold-on-navy voice. Rendered only
 * when an approved, published announcement has hero = true (pastoral-only
 * control on the announcement form).
 */

function excerpt(s: string, max: number): string {
  const trimmed = s.trim().replace(/\s+/g, " ");
  if (trimmed.length <= max) return trimmed;
  return trimmed.slice(0, max).replace(/\s+\S*$/, "") + "…";
}

function closesLabel(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Detroit",
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function HeroAnnouncementCard({ hero }: { hero: HeroAnnouncement }) {
  const accent = ANNOUNCEMENT_COLORS[hero.category];
  const cta = hero.isPoll
    ? hero.pollClosed
      ? hero.winnerLabel
        ? `Results are in: ${hero.winnerLabel} →`
        : "See the results →"
      : "Vote now →"
    : "Read more →";

  return (
    <Link
      href={`/announcements/${hero.id}`}
      style={{
        display: "block",
        margin: "12px 20px 0",
        background: "linear-gradient(135deg, #2a2008 0%, #171308 45%, #101624 100%)",
        border: "1px solid rgba(231,184,78,.4)",
        borderRadius: "16px",
        padding: "18px 20px",
        boxShadow: "0 14px 34px -14px rgba(231,184,78,.4)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "5px",
            fontSize: "9.5px",
            fontWeight: 800,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#e7b84e",
          }}
        >
          ★ Featured
        </span>
        <span
          style={{
            display: "inline-block",
            background: accent + "22",
            color: accent,
            fontSize: "9.5px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            padding: "4px 8px",
            borderRadius: "6px",
          }}
        >
          {hero.category}
        </span>
        {hero.isPoll && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "5px",
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: hero.pollClosed ? "#9aa3b8" : "#7ed996",
            }}
          >
            <span
              style={{
                width: "6px",
                height: "6px",
                borderRadius: "50%",
                background: hero.pollClosed ? "#6a738b" : "#4eb86b",
              }}
            />
            {hero.pollClosed ? "Poll closed" : "Poll open"}
          </span>
        )}
      </div>

      <div
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "22px",
          lineHeight: 1.05,
          color: "#fff6e6",
          marginTop: "10px",
        }}
      >
        {hero.title}
      </div>

      <p
        style={{
          margin: "10px 0 0",
          fontSize: "13.5px",
          fontWeight: 500,
          lineHeight: 1.5,
          color: "rgba(255,244,228,.82)",
        }}
      >
        {excerpt(hero.body, 140)}
      </p>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginTop: "14px",
        }}
      >
        <span
          style={{
            fontSize: "12.5px",
            fontWeight: 800,
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            color: "#ffe6b8",
          }}
        >
          {cta}
        </span>
        {hero.isPoll && !hero.pollClosed && hero.pollClosesAt && (
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "rgba(255,238,214,.6)",
              whiteSpace: "nowrap",
            }}
          >
            Voting closes {closesLabel(hero.pollClosesAt)}
          </span>
        )}
      </div>
    </Link>
  );
}
