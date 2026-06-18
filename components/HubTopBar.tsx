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
            Tap Hub
          </span>
        </span>
      </div>
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
    </div>
  );
}
