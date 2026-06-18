import Link from "next/link";
import type { ReactNode } from "react";

export function BackBar({
  href = "/",
  title,
  subtitle,
  right,
}: {
  href?: string;
  title: string;
  subtitle?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div
      style={{
        position: "sticky",
        top: 0,
        zIndex: 20,
        background: "rgba(11,16,28,.94)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        borderBottom: "1px solid rgba(244,241,234,.08)",
        padding: "14px 16px",
        display: "flex",
        alignItems: "center",
        gap: "13px",
      }}
    >
      <Link
        href={href}
        aria-label="Back"
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "11px",
          background: "#1a2438",
          border: "1px solid rgba(244,241,234,.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          textDecoration: "none",
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M15 6l-6 6 6 6"
            stroke="#f4f1ea"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </Link>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "20px",
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        {subtitle != null && (
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#e7b84e",
              marginTop: "3px",
            }}
          >
            {subtitle}
          </div>
        )}
      </div>
      {right}
    </div>
  );
}
