"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { confirmPasswordReset } from "../actions";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 15px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "11px",
  fontSize: "15px",
  color: "#f4f1ea",
  background: "#070b14",
  outline: "none",
  marginBottom: "14px",
};

export function ResetConfirmForm() {
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div>
        <div
          style={{
            padding: "16px 18px",
            borderRadius: "12px",
            background: "rgba(78,184,107,.1)",
            border: "1px solid rgba(78,184,107,.3)",
            fontSize: "14px",
            fontWeight: 600,
            color: "#cdd3e0",
            lineHeight: 1.6,
            marginBottom: "18px",
          }}
        >
          Password updated. You&apos;re signed in and ready to go.
        </div>
        <Link
          href="/portal"
          style={{
            display: "block",
            textAlign: "center",
            background: "#e7b84e",
            color: "#0b101c",
            fontWeight: 800,
            fontSize: "14px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "16px",
            borderRadius: "12px",
            textDecoration: "none",
          }}
        >
          Go to Dashboard
        </Link>
      </div>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await confirmPasswordReset(password);
      if (r.ok) setDone(true);
      else setError(r.error);
    });
  }

  return (
    <form onSubmit={onSubmit}>
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        autoFocus
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="New password (8+ characters)"
        style={inputStyle}
      />
      {error && (
        <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>{error}</div>
      )}
      <button
        type="submit"
        disabled={pending || !password}
        style={{
          width: "100%",
          background: "#e7b84e",
          color: "#0b101c",
          fontWeight: 800,
          fontSize: "14px",
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          padding: "16px",
          borderRadius: "12px",
          border: "none",
          cursor: pending ? "wait" : "pointer",
          opacity: pending || !password ? 0.65 : 1,
        }}
      >
        {pending ? "Saving…" : "Set New Password"}
      </button>
    </form>
  );
}
