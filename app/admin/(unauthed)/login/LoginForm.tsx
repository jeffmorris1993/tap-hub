"use client";

import { useState, useTransition } from "react";
import { sendMagicLink } from "./actions";

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await sendMagicLink({ email, next });
      if (!r.ok) setError(r.error);
    });
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
        placeholder="you@nehtemple.org"
        style={{
          width: "100%",
          padding: "14px 15px",
          border: "1.5px solid rgba(244,241,234,.14)",
          borderRadius: "11px",
          fontSize: "15px",
          color: "#f4f1ea",
          background: "#070b14",
          outline: "none",
          marginBottom: "14px",
        }}
      />
      {error && (
        <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>{error}</div>
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
        {pending ? "Sending…" : "Send Magic Link"}
      </button>
    </form>
  );
}
