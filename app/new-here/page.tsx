"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { submitNewHere, type NewHereResult } from "./actions";

const INTERESTS = [
  "Salvation & Baptism",
  "Becoming a Member",
  "Joining a Ministry",
  "Ignite Youth",
  "Kids Ministry",
  "Small Groups",
  "Serving / Volunteering",
  "Prayer",
];

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 15px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "11px",
  fontSize: "15px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#cdd3e0",
};

function segmentStyle(on: boolean): React.CSSProperties {
  return {
    flex: 1,
    fontWeight: 800,
    fontSize: "13.5px",
    padding: "14px",
    borderRadius: "11px",
    cursor: "pointer",
    background: on ? "#e7b84e" : "#121a2e",
    color: on ? "#0b101c" : "#cdd3e0",
    border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
  };
}

export default function NewHere() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [firstTime, setFirstTime] = useState<boolean | null>(null);
  const [interests, setInterests] = useState<string[]>([]);
  const [result, setResult] = useState<NewHereResult | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle(label: string) {
    setInterests((cur) =>
      cur.includes(label) ? cur.filter((x) => x !== label) : [...cur, label],
    );
  }

  function onSubmit() {
    startTransition(async () => {
      const r = await submitNewHere({ name, email, phone, firstTime, interests });
      setResult(r);
    });
  }

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="I'm New Here" subtitle="Welcome to the family" />

        {result?.ok ? (
          <div className="th-up" style={{ padding: "60px 26px", textAlign: "center" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#1a2438",
                border: "1px solid rgba(231,184,78,.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "30px",
                marginTop: "22px",
              }}
            >
              So glad you&apos;re here
            </h3>
            <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 500, lineHeight: 1.6, marginTop: "12px" }}>
              Thanks, {result.firstName} — someone from our welcome team will reach out soon. Come say hi at the Welcome Desk this Sunday!
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                marginTop: "28px",
                background: "#1a2438",
                color: "#fff",
                border: "1px solid rgba(244,241,234,.14)",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "15px 34px",
                borderRadius: "11px",
                textDecoration: "none",
              }}
            >
              Back to Hub
            </Link>
          </div>
        ) : (
          <div style={{ padding: "20px 18px 40px" }}>
            <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.55, marginBottom: "22px" }}>
              We&apos;d love to know you&apos;re here. Share a little about yourself and we&apos;ll help you take a next step.
            </p>

            <label style={{ ...labelStyle, marginBottom: "7px" }}>Your Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="First & last name"
              style={{ ...inputStyle, marginBottom: "16px" }}
            />

            <label style={{ ...labelStyle, marginBottom: "7px" }}>Email</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder="you@email.com"
              style={{ ...inputStyle, marginBottom: "16px" }}
            />

            <label style={{ ...labelStyle, marginBottom: "7px" }}>Phone</label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              type="tel"
              placeholder="(248) 555-0123"
              style={{ ...inputStyle, marginBottom: "22px" }}
            />

            <label style={{ ...labelStyle, marginBottom: "10px" }}>Is this your first time visiting?</label>
            <div style={{ display: "flex", gap: "10px", marginBottom: "24px" }}>
              <button type="button" onClick={() => setFirstTime(true)} style={segmentStyle(firstTime === true)}>
                Yes, first time
              </button>
              <button type="button" onClick={() => setFirstTime(false)} style={segmentStyle(firstTime === false)}>
                I&apos;ve been before
              </button>
            </div>

            <label style={{ ...labelStyle, marginBottom: "12px" }}>What would you like to learn more about?</label>
            <div style={{ display: "flex", flexDirection: "column", gap: "9px", marginBottom: "26px" }}>
              {INTERESTS.map((it) => {
                const on = interests.includes(it);
                return (
                  <button
                    type="button"
                    key={it}
                    onClick={() => toggle(it)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      width: "100%",
                      textAlign: "left",
                      background: on ? "rgba(231,184,78,.1)" : "#121a2e",
                      border: `1.5px solid ${on ? "rgba(231,184,78,.5)" : "rgba(244,241,234,.08)"}`,
                      borderRadius: "12px",
                      padding: "13px 15px",
                      cursor: "pointer",
                      color: "#f4f1ea",
                    }}
                  >
                    <span
                      style={{
                        width: "24px",
                        height: "24px",
                        borderRadius: "7px",
                        flexShrink: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: on ? "#e7b84e" : "transparent",
                        border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.25)"}`,
                      }}
                    >
                      {on && (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0b101c" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </span>
                    <span style={{ fontSize: "14.5px", fontWeight: 600 }}>{it}</span>
                  </button>
                );
              })}
            </div>

            {result && !result.ok && (
              <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>
                {result.error}
              </div>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={pending}
              style={{
                width: "100%",
                background: "#e7b84e",
                color: "#0b101c",
                fontWeight: 800,
                fontSize: "14px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "17px",
                borderRadius: "12px",
                border: "none",
                cursor: pending ? "wait" : "pointer",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "Sending…" : "Send & Connect Me"}
            </button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
