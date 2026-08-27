import Link from "next/link";
import type { RowView } from "../lib/clock";
import { getJoinLink } from "../lib/join-links";

export function ScheduleRow({ row, href }: { row: RowView; href?: string }) {
  const live = row.status === "live";
  const done = row.status === "done";
  // Join pills only on plain rows — event rows are already wrapped in a Link,
  // and a nested <a> is invalid HTML.
  const join = !href && !done ? getJoinLink(row.where) : null;

  const inner = (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "64px",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-anton)",
            fontSize: "18px",
            color: live ? "#e7b84e" : done ? "#52596b" : "#f4f1ea",
            lineHeight: 1,
          }}
        >
          {row.time}
        </span>
        <span
          style={{
            fontSize: "9px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: "#6a738b",
            marginTop: "2px",
          }}
        >
          {row.ampm}
        </span>
      </div>
      <div style={{ width: "1px", alignSelf: "stretch", background: "rgba(244,241,234,.1)" }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 800, fontSize: "15px", color: "#f4f1ea" }}>{row.label}</div>
        <div style={{ fontSize: "12.5px", color: "#9aa3b8", fontWeight: 600, marginTop: "2px" }}>{row.where}</div>
        {join && (
          <a
            href={join.href}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "6px",
              marginTop: "8px",
              padding: "7px 12px",
              borderRadius: "8px",
              background: live ? "#e7b84e" : "rgba(231,184,78,.14)",
              border: `1px solid ${live ? "#e7b84e" : "rgba(231,184,78,.3)"}`,
              color: live ? "#0b101c" : "#e7b84e",
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              textDecoration: "none",
            }}
          >
            {join.kind === "phone" ? (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="6" width="13" height="12" rx="2.5" />
                <path d="M15 10.5l7-3.5v10l-7-3.5z" />
              </svg>
            )}
            {join.label}
          </a>
        )}
      </div>
      <span
        style={{
          flexShrink: 0,
          fontSize: "9.5px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          padding: "5px 9px",
          borderRadius: "6px",
          background: live ? "#e7b84e" : done ? "rgba(244,241,234,.06)" : "rgba(231,184,78,.14)",
          color: live ? "#0b101c" : done ? "#52596b" : "#e7b84e",
        }}
      >
        {live ? "Live" : done ? "Done" : "Soon"}
      </span>
    </>
  );

  const wrapperStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: live ? "linear-gradient(135deg,#1c2740,#141d31)" : "#121a2e",
    border: `1px solid ${live ? "rgba(231,184,78,.45)" : "rgba(244,241,234,.08)"}`,
    borderRadius: "14px",
    padding: "14px 16px",
    opacity: done ? 0.5 : 1,
    textDecoration: "none",
    color: "inherit",
  };

  if (href) {
    return (
      <Link href={href} style={wrapperStyle}>
        {inner}
      </Link>
    );
  }
  return <div style={wrapperStyle}>{inner}</div>;
}
