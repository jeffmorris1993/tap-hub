"use client";

import { useState, useTransition } from "react";
import { requestPasswordReset } from "./actions";
import { EmailSuggestion } from "../../../../components/EmailSuggestion";

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

export function ResetRequestForm() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (done) {
    return (
      <div
        style={{
          padding: "16px 18px",
          borderRadius: "12px",
          background: "rgba(231,184,78,.08)",
          border: "1px solid rgba(231,184,78,.25)",
          fontSize: "14px",
          fontWeight: 600,
          color: "#cdd3e0",
          lineHeight: 1.6,
        }}
      >
        If an account exists for <strong style={{ color: "#f4f1ea" }}>{email}</strong>, a reset
        link is on its way. Click it to choose a new password.
      </div>
    );
  }

  function submit(opts?: { useEmail?: string; confirmedEmail?: boolean }) {
    const address = opts?.useEmail ?? email;
    setError(null);
    setSuggestion(null);
    startTransition(async () => {
      const r = await requestPasswordReset(address, {
        confirmedEmail: opts?.confirmedEmail,
      });
      if (r.ok) {
        setEmail(address);
        setDone(true);
        return;
      }
      setError(r.error);
      setSuggestion(r.suggestion ?? null);
    });
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    submit();
  }

  return (
    <form onSubmit={onSubmit}>
      <input
        type="email"
        required
        autoComplete="email"
        autoFocus
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        style={inputStyle}
      />
      {error && !suggestion && (
        <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>{error}</div>
      )}
      {suggestion && (
        <EmailSuggestion
          suggestion={suggestion}
          pending={pending}
          onAccept={() => submit({ useEmail: suggestion, confirmedEmail: true })}
          onKeep={() => submit({ confirmedEmail: true })}
        />
      )}
      <button
        type="submit"
        disabled={pending || !email}
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
          opacity: pending || !email ? 0.65 : 1,
        }}
      >
        {pending ? "Sending…" : "Send Reset Link"}
      </button>
    </form>
  );
}
