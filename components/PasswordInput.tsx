"use client";

import { useState } from "react";

/**
 * Password field with a show/hide (eye) toggle. Styling comes from the
 * caller's inputStyle so it drops into the login/signup/reset forms
 * unchanged; the wrapper absorbs the input's marginBottom so spacing holds.
 */
export function PasswordInput({
  value,
  onChange,
  placeholder = "Password",
  autoComplete,
  required,
  minLength,
  style,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  autoComplete?: string;
  required?: boolean;
  minLength?: number;
  style?: React.CSSProperties;
}) {
  const [show, setShow] = useState(false);
  const { marginBottom, ...inputStyle } = style ?? {};
  return (
    <div style={{ position: "relative", marginBottom }}>
      <input
        type={show ? "text" : "password"}
        required={required}
        minLength={minLength}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...inputStyle, marginBottom: 0, paddingRight: "48px" }}
      />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Hide password" : "Show password"}
        aria-pressed={show}
        style={{
          position: "absolute",
          right: "6px",
          top: "50%",
          transform: "translateY(-50%)",
          background: "none",
          border: "none",
          padding: "8px",
          cursor: "pointer",
          color: "#9aa3b8",
          display: "flex",
          alignItems: "center",
        }}
      >
        {show ? (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M17.94 17.94A10.6 10.6 0 0112 20C5 20 1 12 1 12a20.8 20.8 0 015.1-6.1M9.9 4.24A10.4 10.4 0 0112 4c7 0 11 8 11 8a20.9 20.9 0 01-3.2 4.4" />
            <path d="M9.88 9.88a3 3 0 104.24 4.24" />
            <path d="M1 1l22 22" />
          </svg>
        ) : (
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        )}
      </button>
    </div>
  );
}
