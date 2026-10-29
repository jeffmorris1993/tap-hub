"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { submitPastorMeeting, type PastorMeetingResult } from "./actions";

const inputStyle: React.CSSProperties = {
  width: "100%",
  minHeight: "56px",
  padding: "0 16px",
  border: "1.5px solid rgba(244,241,234,.2)",
  borderRadius: "12px",
  fontSize: "17px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#cdd3e0",
  marginBottom: "8px",
};

const helperStyle: React.CSSProperties = {
  color: "#aab3c5",
  fontSize: "15px",
  lineHeight: 1.45,
  marginTop: "-6px",
};

export default function MeetThePastor() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [details, setDetails] = useState("");
  const [result, setResult] = useState<PastorMeetingResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    startTransition(async () => {
      const r = await submitPastorMeeting({ name, phone, email, details });
      if (r.ok) setDetails("");
      setResult(r);
    });
  }

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="Meet with the Pastor" />

        {result?.ok ? (
          <div
            className="th-up"
            style={{
              padding: "56px 22px 40px",
              textAlign: "center",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: "88px",
                height: "88px",
                borderRadius: "50%",
                background: "#1a2438",
                border: "1px solid rgba(231,184,78,.4)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "34px",
                lineHeight: 1,
              }}
            >
              Request Sent
            </h2>
            <p style={{ color: "#cdd3e0", fontSize: "18px", lineHeight: 1.55 }}>
              Thank you, {result.firstName}. Someone from the Pastor&apos;s office will be in
              contact with you soon.
            </p>
            <Link
              href="/"
              style={{
                width: "100%",
                minHeight: "56px",
                background: "#1a2438",
                color: "#f4f1ea",
                border: "1px solid rgba(244,241,234,.16)",
                fontWeight: 800,
                fontSize: "16px",
                borderRadius: "12px",
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              Back to Hub
            </Link>
          </div>
        ) : (
          <div
            style={{
              padding: "26px 20px 40px",
              display: "flex",
              flexDirection: "column",
              gap: "18px",
            }}
          >
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <h2
                style={{
                  fontFamily: "var(--font-anton)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  fontSize: "32px",
                  lineHeight: 1,
                }}
              >
                Request <span style={{ color: "#e7b84e" }}>a meeting</span>
              </h2>
              <p style={{ color: "#cdd3e0", fontSize: "17px", lineHeight: 1.55 }}>
                Tell us how to reach you and what you&apos;d like to talk about. Someone from
                the Pastor&apos;s office will contact you to set up a time.
              </p>
            </div>

            <label>
              <span style={labelStyle}>Your name</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoComplete="name"
                placeholder="First & last name"
                style={inputStyle}
              />
            </label>

            <label>
              <span style={labelStyle}>Phone</span>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                autoComplete="tel"
                placeholder="(248) 555-0123"
                style={inputStyle}
              />
            </label>

            <label>
              <span style={labelStyle}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                placeholder="you@email.com"
                style={inputStyle}
              />
            </label>
            <p style={helperStyle}>Phone or email is fine. You only need one.</p>

            <label>
              <span style={labelStyle}>What would you like to meet about?</span>
              <textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                rows={5}
                placeholder="Share as much or as little as you'd like."
                style={{
                  ...inputStyle,
                  padding: "14px 16px",
                  lineHeight: 1.5,
                  resize: "vertical",
                }}
              />
            </label>
            <p style={helperStyle}>Only the Pastor&apos;s office sees this.</p>

            {result && !result.ok && (
              <p role="alert" style={{ color: "#ffb3a5", fontWeight: 700, fontSize: "16px", lineHeight: 1.45 }}>
                {result.error}
              </p>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={pending}
              style={{
                width: "100%",
                minHeight: "64px",
                background: "#e7b84e",
                color: "#0b101c",
                fontWeight: 800,
                fontSize: "19px",
                borderRadius: "14px",
                border: "none",
                cursor: "pointer",
                boxShadow: "0 14px 30px -14px rgba(231,184,78,.6)",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "Sending…" : "Send Request"}
            </button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
