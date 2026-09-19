"use client";

import { useState, useTransition } from "react";
import { cancelSignup } from "./actions";

export function CancelButton({ signupId }: { signupId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        style={{
          background: "transparent",
          border: "1px solid rgba(244,241,234,.14)",
          color: "#9aa3b8",
          fontWeight: 800,
          fontSize: "11px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          padding: "9px 14px",
          borderRadius: "9px",
          cursor: "pointer",
          whiteSpace: "nowrap",
        }}
      >
        Cancel signup
      </button>
    );
  }

  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
      {error && <span style={{ color: "#ff8a8a", fontSize: "12px", fontWeight: 700 }}>{error}</span>}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            const r = await cancelSignup(signupId);
            if (!r.ok) setError(r.error ?? "Something went wrong.");
          })
        }
        style={{
          background: "rgba(181,50,65,.16)",
          border: "1px solid rgba(181,50,65,.5)",
          color: "#ff8a8a",
          fontWeight: 800,
          fontSize: "11px",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          padding: "9px 14px",
          borderRadius: "9px",
          cursor: pending ? "wait" : "pointer",
          whiteSpace: "nowrap",
        }}
      >
        {pending ? "Cancelling…" : "Yes, cancel"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        style={{
          background: "transparent",
          border: "none",
          color: "#9aa3b8",
          fontWeight: 700,
          fontSize: "12px",
          cursor: "pointer",
        }}
      >
        Keep it
      </button>
    </span>
  );
}
