"use client";

import { useState, useTransition } from "react";
import { signUp } from "./actions";

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

export function SignupForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
        Almost there! We sent a confirmation link to{" "}
        <strong style={{ color: "#f4f1ea" }}>{email}</strong>. Click it to activate your account,
        then sign in.
      </div>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await signUp({ name, email, password });
      if (r.ok) setDone(true);
      else setError(r.error);
    });
  }

  const disabled = pending || !name || !email || !password;

  return (
    <form onSubmit={onSubmit}>
      <input
        required
        autoComplete="name"
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        style={inputStyle}
      />
      <input
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@email.com"
        style={inputStyle}
      />
      <input
        type="password"
        required
        minLength={8}
        autoComplete="new-password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (8+ characters)"
        style={inputStyle}
      />
      {error && (
        <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>{error}</div>
      )}
      <button
        type="submit"
        disabled={disabled}
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
          cursor: disabled ? "wait" : "pointer",
          opacity: disabled ? 0.65 : 1,
        }}
      >
        {pending ? "Creating account…" : "Create Account"}
      </button>
    </form>
  );
}
