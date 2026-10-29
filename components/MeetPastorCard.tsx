import Link from "next/link";

/** Full-width hub card linking to the meeting-request form. */
export function MeetPastorCard() {
  return (
    <Link
      href="/meet-the-pastor"
      style={{
        margin: "12px 20px 0",
        background: "#121a2e",
        border: "1px solid rgba(231,184,78,.32)",
        borderRadius: "16px",
        padding: "16px 18px",
        display: "flex",
        alignItems: "center",
        gap: "16px",
        textDecoration: "none",
        color: "#f4f1ea",
      }}
    >
      <span
        style={{
          width: "52px",
          height: "52px",
          borderRadius: "13px",
          background: "#1a2438",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" />
          <path d="M3.5 9.5h17M8 3v4M16 3v4M9 14.5l2 2 4-4" />
        </svg>
      </span>
      <span style={{ flex: 1, display: "flex", flexDirection: "column", gap: "5px" }}>
        <span
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "20px",
            lineHeight: 1,
          }}
        >
          Meet with the Pastor
        </span>
        <span style={{ fontSize: "13.5px", fontWeight: 600, color: "#aab3c5" }}>
          Request a time to talk
        </span>
      </span>
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
        <path d="M9 6l6 6-6 6" stroke="#e7b84e" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </Link>
  );
}
