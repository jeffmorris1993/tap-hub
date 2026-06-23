import Link from "next/link";
import type { RowView } from "../lib/clock";

export function ScheduleRow({ row, href }: { row: RowView; href?: string }) {
  const live = row.status === "live";
  const done = row.status === "done";

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
