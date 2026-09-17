import Link from "next/link";
import {
  IGNITE_PARENT_FORM_PATH,
  igniteParentFormCloseLabel,
} from "../lib/ignite-form";

/**
 * Temporary Tap Hub promotion for the Ignite Youth parent/family update form.
 *
 * Rendered only while igniteParentFormOpen() is true (see app/page.tsx), so it
 * retires itself on the close date without anyone deleting code. Uses Ignite's
 * ember gradient rather than the hub's gold so it reads as a sibling of the
 * "I'm New Here" card instead of competing with it.
 */
export function IgniteParentCard() {
  const closesOn = igniteParentFormCloseLabel();

  return (
    <Link
      href={IGNITE_PARENT_FORM_PATH}
      style={{
        display: "block",
        margin: "12px 20px 0",
        background:
          "linear-gradient(135deg, hsl(28 70% 35%), hsl(8 60% 22%))",
        border: "1px solid rgba(231,184,78,.35)",
        borderRadius: "16px",
        padding: "18px 20px",
        boxShadow: "0 14px 34px -14px rgba(200,110,40,.55)",
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <span
          style={{
            width: "44px",
            height: "44px",
            borderRadius: "12px",
            background: "rgba(11,16,28,.26)",
            border: "1px solid rgba(231,184,78,.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="#f7d894" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3c.6 3.1 3.4 4.2 3.4 7.2a3.4 3.4 0 01-6.8.3C8.6 8.7 10 7.6 12 3z" />
            <path d="M12 21a6 6 0 006-6c0-1.6-.7-2.9-1.7-4.2" />
            <path d="M12 21a6 6 0 01-6-6c0-1.6.7-2.9 1.7-4.2" />
          </svg>
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: "9.5px",
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#f0c978",
            }}
          >
            Ignite Youth · Parents
          </div>
          <div
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "21px",
              lineHeight: 1.05,
              color: "#fff6e6",
              marginTop: "4px",
            }}
          >
            Ignite Parent Update
          </div>
        </div>
      </div>

      <p
        style={{
          margin: "12px 0 0",
          fontSize: "13.5px",
          fontWeight: 500,
          lineHeight: 1.5,
          color: "rgba(255,244,228,.84)",
        }}
      >
        Parents &amp; guardians: help us prepare for 2027 by updating your family information and
        sharing how Ignite can better serve your family.
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
          Complete Form →
        </span>
        {closesOn && (
          <span
            style={{
              fontSize: "10.5px",
              fontWeight: 700,
              color: "rgba(255,238,214,.6)",
              whiteSpace: "nowrap",
            }}
          >
            Open through {closesOn}
          </span>
        )}
      </div>
    </Link>
  );
}
