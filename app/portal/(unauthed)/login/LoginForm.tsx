"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { sendMagicLink, signInWithPassword } from "./actions";

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

const primaryBtnStyle = (disabled: boolean): React.CSSProperties => ({
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
  cursor: disabled ? "wait" : "pointer",
  opacity: disabled ? 0.65 : 1,
});

export function LoginForm({ next }: { next: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [magic, setMagic] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = magic
        ? await sendMagicLink({ email, next })
        : await signInWithPassword({ email, password, next });
      if (r && !r.ok) setError(r.error);
    });
  }

  const disabled = pending || !email || (!magic && !password);

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
      {!magic && (
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          style={inputStyle}
        />
      )}
      {error && (
        <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>{error}</div>
      )}
      <button type="submit" disabled={disabled} style={primaryBtnStyle(disabled)}>
        {pending ? "Signing in…" : magic ? "Send Magic Link" : "Sign In"}
      </button>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: "16px",
          gap: "10px",
          flexWrap: "wrap",
        }}
      >
        <button
          type="button"
          onClick={() => {
            setMagic((m) => !m);
            setError(null);
          }}
          style={{
            background: "none",
            border: "none",
            color: "#9aa3b8",
            fontSize: "12.5px",
            fontWeight: 700,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {magic ? "Use a password instead" : "Email me a sign-in link"}
        </button>
        {!magic && (
          <Link
            href={`/portal/reset?next=${encodeURIComponent(next)}`}
            style={{ color: "#9aa3b8", fontSize: "12.5px", fontWeight: 700, textDecoration: "none" }}
          >
            Forgot password?
          </Link>
        )}
      </div>
    </form>
  );
}
