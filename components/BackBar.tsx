import type { ReactNode } from "react";
import { BackButton } from "./BackButton";

export function BackBar({
  href = "/",
  title,
  subtitle,
  right,
}: {
  /** Fallback destination when there's no in-app history (NFC tap,
   *  direct link, fresh tab). When history exists, the back button
   *  uses router.back() instead. */
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
      <BackButton fallback={href} />
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
