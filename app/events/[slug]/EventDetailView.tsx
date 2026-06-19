"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PhoneShell } from "../../../components/PhoneShell";
import { BackBar } from "../../../components/BackBar";
import { EventHero } from "../../../components/EventHero";
import { submitEventSignup, type EventSignupResult } from "./actions";
import type { DisplayEvent } from "../../../lib/events-display";

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

export function EventDetailView({ event }: { event: DisplayEvent }) {
  const [role, setRole] = useState<"attendee" | "volunteer">("attendee");
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [result, setResult] = useState<EventSignupResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    startTransition(async () => {
      const r = await submitEventSignup({ slug: event.slug, name, contact, role });
      setResult(r);
    });
  }

  if (result?.ok) {
    const doneMsg =
      result.role === "volunteer"
        ? `Thank you for volunteering for ${event.title}! Our team will follow up with details and your role.`
        : `We've saved your spot for ${event.title}. Watch for a reminder and any updates.`;
    return (
      <PhoneShell>
        <div className="th-slide" style={{ minHeight: "100vh" }}>
          <BackBar href="/events" title={event.title} />
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
                fontSize: "28px",
                marginTop: "22px",
              }}
            >
              You&apos;re signed up!
            </h3>
            <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 500, lineHeight: 1.6, marginTop: "12px" }}>
              {doneMsg}
            </p>
            <Link
              href="/events"
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
              Back to Events
            </Link>
          </div>
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar href="/events" title={event.title} />
        <div style={{ padding: "0 0 40px" }}>
          <EventHero hue={event.hue} height={200}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(to top, rgba(11,16,28,.95), transparent 60%)",
              }}
            />
            <div style={{ position: "absolute", left: "18px", bottom: "16px", right: "18px" }}>
              <span
                style={{
                  display: "inline-block",
                  background: "#e7b84e",
                  color: "#6b531a",
                  fontSize: "10px",
                  fontWeight: 800,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  padding: "5px 11px",
                  borderRadius: "6px",
                }}
              >
                {event.category}
              </span>
              <h2
                style={{
                  fontFamily: "var(--font-anton)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  fontSize: "26px",
                  lineHeight: 1.02,
                  marginTop: "10px",
                }}
              >
                {event.title}
              </h2>
            </div>
          </EventHero>

          <div style={{ padding: "20px 18px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "12px",
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "14px",
                padding: "16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="4" y="5" width="16" height="16" rx="2.5" />
                  <path d="M4 9.5h16M8 3v4M16 3v4" />
                </svg>
                <span style={{ fontSize: "14px", fontWeight: 700 }}>{event.whenText}</span>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 21s-7-4.5-7-10a7 7 0 1114 0c0 5.5-7 10-7 10z" />
                  <circle cx="12" cy="11" r="2.3" />
                </svg>
                <span style={{ fontSize: "14px", fontWeight: 700 }}>{event.location}</span>
              </div>
            </div>
            <p style={{ color: "#cdd3e0", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.6, marginTop: "18px" }}>
              {event.description_long}
            </p>

            <div
              style={{
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#cdd3e0",
                margin: "24px 0 11px",
              }}
            >
              I&apos;d like to —
            </div>
            <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
              <button type="button" onClick={() => setRole("attendee")} style={segmentStyle(role === "attendee")}>
                Attend
              </button>
              <button type="button" onClick={() => setRole("volunteer")} style={segmentStyle(role === "volunteer")}>
                Volunteer
              </button>
            </div>

            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              style={{ ...inputStyle, marginBottom: "12px" }}
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone"
              style={{ ...inputStyle, marginBottom: "18px" }}
            />
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
              {pending ? "Sending…" : role === "volunteer" ? "Sign Up to Volunteer" : "Sign Up to Attend"}
            </button>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
