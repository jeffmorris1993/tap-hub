"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PhoneShell } from "../../../components/PhoneShell";
import { BackBar } from "../../../components/BackBar";
import { submitEventSignup, type EventSignupResult } from "./actions";
import type { DisplayEvent } from "../../../lib/events-display";
import { ANNOUNCEMENT_COLORS } from "../../../lib/announcement-types";
import { googleCalendarUrl, outlookCalendarUrl } from "../../../lib/event-calendar";

/** One upcoming date of a recurring series, for the date switcher. */
export type OccurrenceChoice = { date: string; label: string };
/** The server-resolved occurrence this page is anchored on. */
export type SelectedOccurrence = { date: string; iso: string; label: string };

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

const calendarBtnStyle: React.CSSProperties = {
  flex: 1,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "6px",
  background: "#1a2438",
  color: "#cdd3e0",
  border: "1px solid rgba(244,241,234,.14)",
  borderRadius: "10px",
  padding: "12px 6px",
  fontSize: "11.5px",
  fontWeight: 800,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  textDecoration: "none",
  whiteSpace: "nowrap",
};

function calendarModeStyle(on: boolean): React.CSSProperties {
  return {
    flex: 1,
    fontWeight: 800,
    fontSize: "11px",
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    padding: "9px 8px",
    borderRadius: "8px",
    cursor: "pointer",
    background: on ? "#e7b84e" : "transparent",
    color: on ? "#0b101c" : "#9aa3b8",
    border: "none",
  };
}

function AddToCalendarRow({
  event,
  occurrence,
}: {
  event: DisplayEvent;
  occurrence: SelectedOccurrence | null;
}) {
  const recurring = event.recurrence_kind !== "none";
  const [mode, setMode] = useState<"occurrence" | "series">(recurring ? "occurrence" : "series");

  // With a server-resolved occurrence the URLs are deterministic between
  // server render and hydration. Without one (series over, page kept as a
  // fallback) the builders resolve "next occurrence" client-side, which can
  // drift from the cached render — hence suppressHydrationWarning.
  const occDate = occurrence ? new Date(occurrence.iso) : null;
  const single = recurring && mode === "occurrence" && occurrence !== null;
  const linkOpts = occDate
    ? { occurrence: occDate, mode: single ? ("occurrence" as const) : ("series" as const) }
    : {};
  const icsParams = occurrence
    ? `?date=${occurrence.date}&mode=${single ? "occurrence" : "series"}`
    : "";

  return (
    <div style={{ marginTop: "14px", textAlign: "left" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          marginBottom: "8px",
        }}
      >
        <div
          style={{
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "#9aa3b8",
          }}
        >
          Add to calendar
        </div>
        {recurring && occurrence && (
          <div
            style={{
              display: "flex",
              gap: "2px",
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.12)",
              borderRadius: "9px",
              padding: "2px",
            }}
          >
            <button type="button" onClick={() => setMode("occurrence")} style={calendarModeStyle(mode === "occurrence")}>
              This date
            </button>
            <button type="button" onClick={() => setMode("series")} style={calendarModeStyle(mode === "series")}>
              Full series
            </button>
          </div>
        )}
      </div>
      <div style={{ display: "flex", gap: "8px" }}>
        <a
          href={googleCalendarUrl(event, linkOpts)}
          target="_blank"
          rel="noopener noreferrer"
          suppressHydrationWarning
          style={calendarBtnStyle}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="5" width="16" height="16" rx="2.5" />
            <path d="M4 9.5h16M8 3v4M16 3v4M12 12.5v5M9.5 15h5" />
          </svg>
          Google
        </a>
        <a
          href={outlookCalendarUrl(event, linkOpts)}
          target="_blank"
          rel="noopener noreferrer"
          suppressHydrationWarning
          style={calendarBtnStyle}
        >
          Outlook
        </a>
        <a href={`/api/events/${event.slug}/ics${icsParams}`} style={calendarBtnStyle}>
          Apple / .ics
        </a>
      </div>
    </div>
  );
}

/** Render description text with URLs as tappable links (e.g. Zoom links). */
function LinkifiedText({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s]+)/g);
  return (
    <>
      {parts.map((part, i) =>
        /^https?:\/\//.test(part) ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#e7b84e", fontWeight: 700, wordBreak: "break-all" }}
          >
            {part}
          </a>
        ) : (
          <span key={i}>{part}</span>
        ),
      )}
    </>
  );
}

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

export function EventDetailView({
  event,
  occurrence,
  choices,
}: {
  event: DisplayEvent;
  occurrence: SelectedOccurrence | null;
  choices: OccurrenceChoice[];
}) {
  // Three independent signup affordances:
  //   1. External Register button   — whenever registration_url is set
  //   2. In-app Attend form         — when accepts_rsvps && no external URL
  //   3. In-app Volunteer form      — when allow_volunteers
  //
  // The Attend/Volunteer toggle is only needed when BOTH in-app forms
  // would otherwise want the same screen real estate. An external
  // Register button is a one-tap link, so it doesn't fight the
  // volunteer form for space — they stack.
  const hasExternalRegister = !!event.registration_url;
  const hasInAppAttend = event.accepts_rsvps && !hasExternalRegister;
  const hasInAppVolunteer = event.allow_volunteers;
  const showToggle = hasInAppAttend && hasInAppVolunteer;

  const [role, setRole] = useState<"attendee" | "volunteer">(
    hasInAppAttend ? "attendee" : "volunteer",
  );
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [notes, setNotes] = useState("");
  const [result, setResult] = useState<EventSignupResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmit() {
    startTransition(async () => {
      const r = await submitEventSignup({
        slug: event.slug,
        name,
        contact,
        role,
        notes,
        occurrenceDate: occurrence?.date,
      });
      setResult(r);
    });
  }

  if (result?.ok) {
    const forDate =
      event.recurrence_kind !== "none" && occurrence ? ` on ${occurrence.label}` : "";
    const doneMsg =
      result.role === "volunteer"
        ? `Thank you for volunteering for ${event.title}${forDate}! Our team will follow up with details and your role.`
        : `We've saved your spot for ${event.title}${forDate}. Watch for a reminder and any updates.`;
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
            <div style={{ marginTop: "26px" }}>
              <AddToCalendarRow event={event} occurrence={occurrence} />
            </div>
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
              {event.recurrence_kind !== "none" && choices.length > 0 && (
                <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: "5px" }}>
                    <path d="M17 2l4 4-4 4" />
                    <path d="M3 11v-1a4 4 0 014-4h14" />
                    <path d="M7 22l-4-4 4-4" />
                    <path d="M21 13v1a4 4 0 01-4 4H3" />
                  </svg>
                  <span style={{ fontSize: "13px", fontWeight: 600, color: "#9aa3b8", lineHeight: 1.55 }}>
                    <span style={{ marginRight: "8px" }}>{event.recurrenceLabel} ·</span>
                    <span style={{ display: "inline-flex", gap: "6px", flexWrap: "wrap", verticalAlign: "middle" }}>
                      {choices.map((c) => {
                        const on = occurrence?.date === c.date;
                        return (
                          <Link
                            key={c.date}
                            href={`/events/${event.slug}?date=${c.date}`}
                            style={{
                              display: "inline-block",
                              padding: "4px 9px",
                              borderRadius: "7px",
                              fontSize: "12px",
                              fontWeight: 700,
                              textDecoration: "none",
                              background: on ? "#e7b84e" : "#1a2438",
                              color: on ? "#0b101c" : "#cdd3e0",
                              border: `1px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
                            }}
                          >
                            {c.label}
                          </Link>
                        );
                      })}
                    </span>
                  </span>
                </div>
              )}
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
            <AddToCalendarRow event={event} occurrence={occurrence} />
            <p style={{ color: "#cdd3e0", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.6, marginTop: "18px", whiteSpace: "pre-line" }}>
              <LinkifiedText text={event.description_long} />
            </p>

            {!hasExternalRegister && !hasInAppAttend && !hasInAppVolunteer ? (
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
                {/* 1) External Register — independent block. Always
                       shows when a URL is set, alongside any in-app
                       forms below. */}
                {hasExternalRegister && (
                  <div style={{ marginTop: "24px" }}>
                    <div
                      style={{
                        fontSize: "11.5px",
                        fontWeight: 800,
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "#e7b84e",
                        marginBottom: "11px",
                      }}
                    >
                      Register to attend
                    </div>
                    <p
                      style={{
                        color: "#cdd3e0",
                        fontSize: "14px",
                        fontWeight: 500,
                        lineHeight: 1.55,
                        marginBottom: "14px",
                      }}
                    >
                      Registration happens on the official site. Tap below to register.
                    </p>
                    <a
                      href={event.registration_url ?? "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: "block",
                        textAlign: "center",
                        background: "#e7b84e",
                        color: "#0b101c",
                        fontWeight: 800,
                        fontSize: "14px",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        padding: "17px",
                        borderRadius: "12px",
                        textDecoration: "none",
                      }}
                    >
                      {event.registration_label?.trim() || "Register"} →
                    </a>
                  </div>
                )}

                {/* 2) In-app forms — Attend, Volunteer, or both via
                       toggle. The toggle is only needed when both
                       compete for the same form fields. */}
                {showToggle && (
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
                {!showToggle && hasInAppVolunteer && (
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
                {!showToggle && hasInAppAttend && !hasExternalRegister && (
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
                    RSVP
                  </div>
                )}

                {(hasInAppAttend || hasInAppVolunteer) && (
                  <>
                    {event.recurrence_kind !== "none" && occurrence && (
                      <div
                        style={{
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "#cdd3e0",
                          background: "rgba(231,184,78,.08)",
                          border: "1px solid rgba(231,184,78,.25)",
                          borderRadius: "10px",
                          padding: "11px 14px",
                          marginBottom: "14px",
                          lineHeight: 1.5,
                        }}
                      >
                        Signing up for <span style={{ color: "#e7b84e" }}>{occurrence.label}</span>.
                        Want a different date? Pick one above.
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
                )}
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
