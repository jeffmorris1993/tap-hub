"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PhoneShell } from "../../../components/PhoneShell";
import { BackBar } from "../../../components/BackBar";
import { submitEventSignup, type EventSignupResult } from "./actions";
import type { DisplayEvent } from "../../../lib/events-display";
import { ANNOUNCEMENT_COLORS } from "../../../lib/announcement-types";

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
  // Default to attendee if RSVPs are open; otherwise (volunteers-only)
  // start on volunteer so the form is immediately useful.
  const [role, setRole] = useState<"attendee" | "volunteer">(
    event.accepts_rsvps ? "attendee" : "volunteer",
  );
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<EventSignupResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    startTransition(async () => {
      const r = await submitEventSignup({ slug: event.slug, name, contact, role, notes });
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
          <div
            style={{
              position: "relative",
              background: "linear-gradient(150deg,#1c2740,#0f1626)",
              padding: "22px 18px 24px",
              borderBottom: "1px solid rgba(231,184,78,.2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
              <div
                style={{
                  flexShrink: 0,
                  width: "66px",
                  height: "66px",
                  borderRadius: "15px",
                  background: "#e7b84e",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  lineHeight: 1,
                  boxShadow: "0 12px 28px -12px rgba(231,184,78,.55)",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "#6b531a",
                  }}
                >
                  {event.month}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-anton)",
                    fontSize: "28px",
                    color: "#0b101c",
                    marginTop: "1px",
                  }}
                >
                  {event.day}
                </span>
              </div>
              {(() => {
                const accent = ANNOUNCEMENT_COLORS[event.category];
                return (
                  <span
                    style={{
                      display: "inline-block",
                      background: accent + "22",
                      color: accent,
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      padding: "6px 11px",
                      borderRadius: "6px",
                    }}
                  >
                    {event.category}
                  </span>
                );
              })()}
            </div>
            <h2
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "26px",
                lineHeight: 1.02,
                marginTop: "15px",
              }}
            >
              {event.title}
            </h2>
          </div>

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
              {event.cost && event.cost.trim() && (
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="9" />
                    <path d="M14.5 8h-3.5a1.8 1.8 0 100 3.5h2a1.8 1.8 0 110 3.5H9.5M12 6.5v1.5M12 16v1.5" />
                  </svg>
                  <span style={{ fontSize: "14px", fontWeight: 700 }}>{event.cost.trim()}</span>
                </div>
              )}
            </div>
            <p style={{ color: "#cdd3e0", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.6, marginTop: "18px" }}>
              {event.description_long}
            </p>

            {!event.accepts_rsvps && !event.allow_volunteers ? (
              <div
                style={{
                  marginTop: "24px",
                  background: "rgba(78,141,231,.08)",
                  border: "1px solid rgba(78,141,231,.25)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  textAlign: "center",
                  color: "#cdd3e0",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  lineHeight: 1.55,
                }}
              >
                No RSVP needed — just come!
              </div>
            ) : event.signupOpen ? (
              <>
                {event.accepts_rsvps && event.allow_volunteers && (
                  <>
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
                  </>
                )}
                {!event.accepts_rsvps && event.allow_volunteers && (
                  <div
                    style={{
                      fontSize: "11.5px",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#e7b84e",
                      margin: "24px 0 11px",
                    }}
                  >
                    Volunteer signup
                  </div>
                )}

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
                  style={{ ...inputStyle, marginBottom: "12px" }}
                />
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={
                    role === "volunteer"
                      ? "Anything we should know? (which dates you're available, role you'd prefer, etc.) — optional"
                      : "Anything we should know? (dietary needs, kids' ages, etc.) — optional"
                  }
                  rows={3}
                  style={{ ...inputStyle, marginBottom: "18px", resize: "vertical", minHeight: "78px" }}
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
              </>
            ) : (
              <div
                style={{
                  marginTop: "24px",
                  background: "rgba(154,163,184,.08)",
                  border: "1px solid rgba(154,163,184,.25)",
                  borderRadius: "12px",
                  padding: "16px 18px",
                  textAlign: "center",
                  color: "#cdd3e0",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  lineHeight: 1.55,
                }}
              >
                This event has already started — online signups are closed.
                If you&apos;d still like to come, walk-ins are welcome.
              </div>
            )}
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
