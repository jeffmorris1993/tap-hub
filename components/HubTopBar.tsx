import Link from "next/link";
import { LogoMark } from "./LogoMark";
import { LiveClock } from "./LiveClock";

export function HubTopBar() {
  return (
    <div
      style={{
        padding: "20px 20px 10px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "11px" }}>
        <LogoMark size="md" />
        <span style={{ display: "flex", flexDirection: "column", lineHeight: 1 }}>
          <span
            style={{
              fontFamily: "var(--font-anton)",
              fontSize: "16px",
              letterSpacing: "0.02em",
              textTransform: "uppercase",
            }}
          >
            Nehemiah&apos;s Temple
          </span>
          <span
            style={{
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "0.28em",
              textTransform: "uppercase",
              color: "#e7b84e",
              marginTop: "4px",
            }}
          >
            NT Gateway
          </span>
        </span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <LiveClock
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "7px",
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.1)",
            borderRadius: "20px",
            padding: "7px 13px",
            fontSize: "11.5px",
            fontWeight: 700,
            color: "#cdd3e0",
            whiteSpace: "nowrap",
          }}
        />
        <Link
          href="/portal"
          aria-label="My account"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "32px",
            height: "32px",
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.1)",
            borderRadius: "20px",
            color: "#cdd3e0",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="8" r="3.5" />
            <path d="M5 20c1.4-3.1 4-4.7 7-4.7s5.6 1.6 7 4.7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
