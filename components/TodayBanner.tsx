"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { type ScheduleRow } from "../lib/clock";
import { buildHero } from "../lib/hero";

export function TodayBanner({
  schedule,
  sundayFallback,
}: {
  schedule: ScheduleRow[];
  sundayFallback: ScheduleRow[];
}) {
  const [hero, setHero] = useState(() => buildHero(schedule, sundayFallback, new Date()));

  useEffect(() => {
    const tick = () => setHero(buildHero(schedule, sundayFallback, new Date()));
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [schedule, sundayFallback]);

  const isEncouragement = hero.emphasis === "encouragement";

  return (
    <Link
      href="/today"
      style={{
        margin: "18px 20px 0",
        background: "linear-gradient(135deg,#15203a,#101728)",
        border: "1px solid rgba(231,184,78,.35)",
        borderRadius: "16px",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <span
        className="th-pulse"
        style={{
          width: "11px",
          height: "11px",
          borderRadius: "50%",
          background: "#e7b84e",
          flexShrink: 0,
        }}
      />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#e7b84e",
          }}
        >
          {hero.badge}
        </div>
        <div
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: isEncouragement ? "13.5px" : "15.5px",
            marginTop: "3px",
            color: "#f4f1ea",
            // Encouragement verses can run long — let them wrap to two
            // lines instead of getting truncated.
            whiteSpace: isEncouragement ? "normal" : "nowrap",
            overflow: isEncouragement ? "visible" : "hidden",
            textOverflow: "ellipsis",
            letterSpacing: "0.01em",
            lineHeight: isEncouragement ? 1.25 : 1.05,
            display: isEncouragement ? "-webkit-box" : "block",
            WebkitLineClamp: isEncouragement ? 2 : undefined,
            WebkitBoxOrient: isEncouragement ? "vertical" : undefined,
          }}
        >
          {hero.headline}
        </div>
        <div
          style={{
            fontSize: "12.5px",
            color: "#9aa3b8",
            fontWeight: 600,
            marginTop: "1px",
            fontStyle: isEncouragement ? "italic" : "normal",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {hero.sub}
        </div>
      </div>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M9 6l6 6-6 6" stroke="#e7b84e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
