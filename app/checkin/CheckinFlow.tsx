"use client";

import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { ATTENDEE_TYPE_LABEL, type AttendeeType } from "../../lib/attendance";
import { INTERESTS } from "../../lib/interests";
import {
  findAndCheckin,
  quickCheckin,
  registerAndCheckin,
  type CheckinOutcome,
} from "./actions";

const STORAGE_KEY = "th-checkin";

type StoredDevice = { attendeeId: string; token: string; firstName: string };

function loadDevice(): StoredDevice | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const v = JSON.parse(raw) as StoredDevice;
    return v && typeof v.token === "string" && typeof v.firstName === "string" ? v : null;
  } catch {
    return null;
  }
}

function saveDevice(device: StoredDevice) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(device));
  } catch {
    // Private mode — the check-in still succeeded, just no quick path next time.
  }
}

function clearDevice() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

const heading: CSSProperties = {
  fontFamily: "var(--font-anton)",
  fontWeight: 400,
  textTransform: "uppercase",
  lineHeight: 1.05,
};

const fieldLabel: CSSProperties = {
  display: "block",
  fontSize: "13px",
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#cdd3e0",
  marginBottom: "8px",
};

const fieldInput: CSSProperties = {
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

const goldButton: CSSProperties = {
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
};

const quietButton: CSSProperties = {
  width: "100%",
  minHeight: "56px",
  background: "#1a2438",
  color: "#f4f1ea",
  border: "1px solid rgba(244,241,234,.16)",
  fontWeight: 800,
  fontSize: "16px",
  borderRadius: "12px",
  cursor: "pointer",
};

const linkButton: CSSProperties = {
  minHeight: "48px",
  background: "none",
  border: "none",
  color: "#e7b84e",
  fontWeight: 800,
  fontSize: "16px",
  cursor: "pointer",
  textDecoration: "underline",
  textUnderlineOffset: "4px",
};

type Screen = "welcome" | "form" | "find" | "loading" | "success" | "already" | "closed";

export function CheckinFlow({
  window: win,
  closed,
}: {
  window: { serviceName: string; whenLabel: string } | null;
  closed: { nextLabel: string | null; schedule: string[] } | null;
}) {
  const [screen, setScreen] = useState<Screen>(win ? "form" : "closed");
  const [device, setDevice] = useState<StoredDevice | null>(null);
  const [err, setErr] = useState("");
  const [done, setDone] = useState<{
    firstName: string;
    serviceName: string;
    timeLabel: string;
    attendeeType: AttendeeType;
  } | null>(null);

  const [form, setForm] = useState({
    type: "" as AttendeeType | "",
    first: "",
    last: "",
    phone: "",
    email: "",
    pref: "" as "" | "text" | "call" | "email",
    consent: false,
    interests: [] as string[],
  });
  const [find, setFind] = useState({ first: "", last: "", contact: "", miss: false });

  useEffect(() => {
    if (!win) return;
    const stored = loadDevice();
    if (!stored) return;
    // Deferred so hydration completes against the server-rendered form
    // before we swap to the remembered-device welcome screen.
    const t = setTimeout(() => {
      setDevice(stored);
      setScreen("welcome");
    }, 0);
    return () => clearTimeout(t);
  }, [win]);

  function applyOutcome(result: CheckinOutcome, fallback: Screen) {
    if (result.ok) {
      if (result.token && result.attendeeId) {
        const stored = {
          attendeeId: result.attendeeId,
          token: result.token,
          firstName: result.firstName,
        };
        saveDevice(stored);
        setDevice(stored);
      }
      setDone({
        firstName: result.firstName,
        serviceName: result.serviceName,
        timeLabel: result.checkedInAtLabel,
        attendeeType: result.attendeeType,
      });
      setScreen(result.status === "already" ? "already" : "success");
      return;
    }
    if (result.code === "closed") {
      setScreen("closed");
      return;
    }
    setErr(result.error);
    setScreen(fallback);
  }

  async function onQuick() {
    if (!device) return;
    setErr("");
    setScreen("loading");
    const result = await quickCheckin({ token: device.token });
    if (!result.ok && result.code === "not_found") {
      // The server no longer knows this device — fall back to the form.
      clearDevice();
      setDevice(null);
      setErr("");
      setScreen("form");
      return;
    }
    applyOutcome(result, "welcome");
  }

  async function onSubmit() {
    if (!form.type) {
      setErr("Please choose Member, Regular Attendee, First-Time Guest, or Returning Guest.");
      return;
    }
    if (!form.first.trim() || !form.last.trim()) {
      setErr("Please enter your first and last name.");
      return;
    }
    setErr("");
    setScreen("loading");
    const result = await registerAndCheckin({
      firstName: form.first,
      lastName: form.last,
      attendeeType: form.type,
      phone: form.phone,
      email: form.email,
      preferredContact: form.pref || undefined,
      contactConsent: form.consent,
      interests: form.interests,
    });
    applyOutcome(result, "form");
  }

  async function onFind() {
    setErr("");
    setFind((f) => ({ ...f, miss: false }));
    setScreen("loading");
    const result = await findAndCheckin({
      firstName: find.first,
      lastName: find.last,
      contact: find.contact,
    });
    if (!result.ok && result.code === "not_found") {
      setFind((f) => ({ ...f, miss: true }));
      setScreen("find");
      return;
    }
    applyOutcome(result, "find");
  }

  function switchPerson() {
    clearDevice();
    setDevice(null);
    setErr("");
    setScreen("form");
  }

  const guest = form.type === "first" || form.type === "returning";

  if (screen === "closed") {
    return (
      <Centered>
        <IconCircle>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </IconCircle>
        <h2 style={{ ...heading, fontSize: "30px" }}>Check-in isn&apos;t open right now</h2>
        {closed?.nextLabel ? (
          <p style={{ color: "#cdd3e0", fontSize: "17px", lineHeight: 1.55 }}>{closed.nextLabel}</p>
        ) : (
          <p style={{ color: "#cdd3e0", fontSize: "17px", lineHeight: 1.55 }}>
            Check-in opens around service times. See you there!
          </p>
        )}
        {closed && closed.schedule.length > 0 && (
          <div
            style={{
              width: "100%",
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.1)",
              borderRadius: "14px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              textAlign: "left",
            }}
          >
            {closed.schedule.map((line) => (
              <span key={line} style={{ color: "#cdd3e0", fontSize: "15px", fontWeight: 600 }}>
                {line}
              </span>
            ))}
          </div>
        )}
        <Link href="/new-here" style={{ ...quietButton, background: "transparent", color: "#e7b84e", border: "1.5px solid #e7b84e", display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          New to Neh Temple? Tell us about you
        </Link>
        <Link href="/" style={{ ...quietButton, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          Back to Hub
        </Link>
      </Centered>
    );
  }

  if (screen === "loading") {
    return (
      <div role="status" style={{ padding: "120px 24px", display: "flex", flexDirection: "column", gap: "22px", alignItems: "center", textAlign: "center" }}>
        <div
          style={{
            width: "46px",
            height: "46px",
            borderRadius: "50%",
            border: "4px solid rgba(231,184,78,.25)",
            borderTopColor: "#e7b84e",
            animation: "thSpinCheckin .8s linear infinite",
          }}
        />
        <style>{`@keyframes thSpinCheckin{to{transform:rotate(360deg)}}`}</style>
        <p style={{ fontSize: "19px", fontWeight: 700 }}>Checking you in…</p>
      </div>
    );
  }

  if (screen === "success" && done) {
    return (
      <Centered animate>
        <IconCircle>
          <CheckIcon />
        </IconCircle>
        <h2 style={{ ...heading, fontSize: "36px" }}>You&apos;re Checked In!</h2>
        <p style={{ color: "#cdd3e0", fontSize: "18px", lineHeight: 1.55 }}>
          Welcome, {done.firstName}. We&apos;re so glad you&apos;re worshipping with us today.
        </p>
        <span
          style={{
            padding: "10px 16px",
            borderRadius: "999px",
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.12)",
            fontWeight: 700,
            fontSize: "15px",
          }}
        >
          {done.serviceName} · {done.timeLabel}
        </span>
        {(done.attendeeType === "first" || done.attendeeType === "returning") && (
          <div
            style={{
              width: "100%",
              textAlign: "left",
              background: "#121a2e",
              border: "1px solid rgba(231,184,78,.32)",
              borderRadius: "16px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              marginTop: "6px",
            }}
          >
            <span style={{ ...heading, fontSize: "21px" }}>Our welcome team knows you&apos;re here</span>
            <span style={{ color: "#cdd3e0", fontSize: "16px", lineHeight: 1.5 }}>
              Someone will reach out to say thanks for visiting. Come find us at the welcome desk
              any time — we&apos;d love to meet you.
            </span>
          </div>
        )}
        <Link href="/" style={{ ...quietButton, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          Back to Hub
        </Link>
      </Centered>
    );
  }

  if (screen === "already" && done) {
    return (
      <Centered>
        <IconCircle>
          <CheckIcon />
        </IconCircle>
        <h2 style={{ ...heading, fontSize: "34px" }}>You&apos;re Already Checked In</h2>
        <p style={{ color: "#cdd3e0", fontSize: "18px", lineHeight: 1.55 }}>
          {done.firstName}, you checked in for {done.serviceName} at {done.timeLabel}. Enjoy the
          service!
        </p>
        <Link href="/" style={{ ...quietButton, display: "flex", alignItems: "center", justifyContent: "center", textDecoration: "none" }}>
          Back to Hub
        </Link>
        <button onClick={switchPerson} style={linkButton}>
          Checking in someone else on this phone?
        </button>
      </Centered>
    );
  }

  if (screen === "welcome" && device && win) {
    const initials = device.firstName.trim().charAt(0).toUpperCase();
    return (
      <Centered>
        <span
          style={{
            width: "96px",
            height: "96px",
            borderRadius: "50%",
            background: "#e7b84e",
            color: "#0b101c",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-anton)",
            fontSize: "36px",
          }}
        >
          {initials}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <h2 style={{ ...heading, fontSize: "36px" }}>Welcome Back, {device.firstName}!</h2>
          <p style={{ color: "#cdd3e0", fontSize: "18px", lineHeight: 1.5 }}>
            Ready to check in for today&apos;s service?
          </p>
        </div>
        <div
          style={{
            width: "100%",
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.1)",
            borderRadius: "14px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            textAlign: "left",
          }}
        >
          <span style={{ fontWeight: 800, fontSize: "18px" }}>{win.serviceName}</span>
          <span style={{ color: "#aab3c5", fontSize: "15px", fontWeight: 600 }}>{win.whenLabel}</span>
        </div>
        {err && (
          <p role="alert" style={{ color: "#ffb3a5", fontWeight: 700, fontSize: "16px", lineHeight: 1.45 }}>
            {err}
          </p>
        )}
        <button onClick={onQuick} style={goldButton}>
          Check In
        </button>
        <button onClick={switchPerson} style={linkButton}>
          Not {device.firstName}? Switch person
        </button>
      </Centered>
    );
  }

  if (screen === "find") {
    return (
      <div style={{ padding: "26px 20px 40px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <h2 style={{ ...heading, fontSize: "32px" }}>Find your check-in</h2>
        <p style={{ color: "#cdd3e0", fontSize: "17px", lineHeight: 1.55 }}>
          Enter your name and the phone number or email you gave us. To protect everyone&apos;s
          privacy, we only connect you when all of it matches.
        </p>
        <label>
          <span style={fieldLabel}>First name</span>
          <input
            value={find.first}
            onChange={(e) => setFind((f) => ({ ...f, first: e.target.value }))}
            autoComplete="given-name"
            style={fieldInput}
          />
        </label>
        <label>
          <span style={fieldLabel}>Last name</span>
          <input
            value={find.last}
            onChange={(e) => setFind((f) => ({ ...f, last: e.target.value }))}
            autoComplete="family-name"
            style={fieldInput}
          />
        </label>
        <label>
          <span style={fieldLabel}>Phone or email</span>
          <input
            value={find.contact}
            onChange={(e) => setFind((f) => ({ ...f, contact: e.target.value }))}
            style={fieldInput}
          />
        </label>
        {find.miss && (
          <div
            role="alert"
            style={{
              padding: "16px",
              borderRadius: "12px",
              background: "rgba(231,184,78,.1)",
              border: "1px solid rgba(231,184,78,.35)",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <p style={{ fontSize: "16px", lineHeight: 1.5 }}>
              We couldn&apos;t confirm a match. You can check in as new and our team will connect
              your records.
            </p>
            <button
              onClick={() => {
                setErr("");
                setScreen("form");
              }}
              style={{
                minHeight: "52px",
                borderRadius: "12px",
                border: "1.5px solid #e7b84e",
                background: "transparent",
                color: "#e7b84e",
                fontWeight: 800,
                fontSize: "16px",
                cursor: "pointer",
              }}
            >
              Check in as new
            </button>
          </div>
        )}
        {err && (
          <p role="alert" style={{ color: "#ffb3a5", fontWeight: 700, fontSize: "16px", lineHeight: 1.45 }}>
            {err}
          </p>
        )}
        <button onClick={onFind} style={goldButton}>
          Find me
        </button>
        <div style={{ textAlign: "center" }}>
          <button
            onClick={() => {
              setErr("");
              setScreen("form");
            }}
            style={linkButton}
          >
            Back to check-in
          </button>
        </div>
      </div>
    );
  }

  // Default: the check-in form.
  return (
    <div style={{ padding: "26px 20px 40px", display: "flex", flexDirection: "column", gap: "22px" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <h2 style={{ ...heading, fontSize: "34px" }}>
          We&apos;re Glad <span style={{ color: "#e7b84e" }}>You&apos;re Here!</span>
        </h2>
        <p style={{ color: "#cdd3e0", fontSize: "17px", lineHeight: 1.55 }}>
          Whether you&apos;re visiting for the first time or you&apos;ve been with us for years,
          take a moment to check in.
        </p>
      </div>

      {win && (
        <div
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.1)",
            borderRadius: "14px",
            padding: "14px 16px",
            display: "flex",
            flexDirection: "column",
            gap: "3px",
          }}
        >
          <span style={{ fontWeight: 800, fontSize: "16px" }}>{win.serviceName}</span>
          <span style={{ color: "#aab3c5", fontSize: "14.5px", fontWeight: 600 }}>{win.whenLabel}</span>
        </div>
      )}

      <div role="radiogroup" aria-label="I am a" style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        <span style={{ ...fieldLabel, marginBottom: 0 }}>I am a…</span>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {(Object.keys(ATTENDEE_TYPE_LABEL) as AttendeeType[]).map((t) => {
            const on = form.type === t;
            return (
              <button
                key={t}
                role="radio"
                aria-checked={on}
                onClick={() => setForm((f) => ({ ...f, type: t }))}
                style={{
                  minHeight: "56px",
                  padding: "0 10px",
                  borderRadius: "12px",
                  border: on ? "1.5px solid #e7b84e" : "1.5px solid rgba(244,241,234,.18)",
                  background: on ? "#e7b84e" : "#121a2e",
                  color: on ? "#0b101c" : "#f4f1ea",
                  fontWeight: 800,
                  fontSize: "15.5px",
                  cursor: "pointer",
                }}
              >
                {ATTENDEE_TYPE_LABEL[t]}
              </button>
            );
          })}
        </div>
      </div>

      {form.type && (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <label>
            <span style={fieldLabel}>First name</span>
            <input
              value={form.first}
              onChange={(e) => setForm((f) => ({ ...f, first: e.target.value }))}
              autoComplete="given-name"
              style={fieldInput}
            />
          </label>
          <label>
            <span style={fieldLabel}>Last name</span>
            <input
              value={form.last}
              onChange={(e) => setForm((f) => ({ ...f, last: e.target.value }))}
              autoComplete="family-name"
              style={fieldInput}
            />
          </label>
          {guest && (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px", paddingTop: "6px" }}>
              <p style={{ color: "#aab3c5", fontSize: "15.5px", lineHeight: 1.5 }}>
                Optional. Leave a way to reach you and we&apos;ll follow up to say thanks for
                visiting.
              </p>
              <label>
                <span style={fieldLabel}>Phone number</span>
                <input
                  type="tel"
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  autoComplete="tel"
                  placeholder="(248) 555-0123"
                  style={fieldInput}
                />
              </label>
              <label>
                <span style={fieldLabel}>Email</span>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                  autoComplete="email"
                  placeholder="you@email.com"
                  style={fieldInput}
                />
              </label>
              <div role="radiogroup" aria-label="Best way to reach you">
                <span style={fieldLabel}>Best way to reach you</span>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {(["text", "call", "email"] as const).map((p) => {
                    const on = form.pref === p;
                    return (
                      <button
                        key={p}
                        role="radio"
                        aria-checked={on}
                        onClick={() => setForm((f) => ({ ...f, pref: on ? "" : p }))}
                        style={{
                          minHeight: "48px",
                          borderRadius: "11px",
                          border: on ? "1.5px solid #e7b84e" : "1.5px solid rgba(244,241,234,.18)",
                          background: on ? "#e7b84e" : "#121a2e",
                          color: on ? "#0b101c" : "#f4f1ea",
                          fontWeight: 800,
                          fontSize: "15px",
                          cursor: "pointer",
                          textTransform: "capitalize",
                        }}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div>
                <span style={fieldLabel}>Want to hear more about anything?</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                  {INTERESTS.map((it) => {
                    const on = form.interests.includes(it);
                    return (
                      <button
                        key={it}
                        type="button"
                        aria-pressed={on}
                        onClick={() =>
                          setForm((f) => ({
                            ...f,
                            interests: on
                              ? f.interests.filter((x) => x !== it)
                              : [...f.interests, it],
                          }))
                        }
                        style={{
                          minHeight: "48px",
                          padding: "0 16px",
                          borderRadius: "11px",
                          border: on ? "1.5px solid #e7b84e" : "1.5px solid rgba(244,241,234,.18)",
                          background: on ? "#e7b84e" : "#121a2e",
                          color: on ? "#0b101c" : "#f4f1ea",
                          fontWeight: 700,
                          fontSize: "15px",
                          cursor: "pointer",
                        }}
                      >
                        {it}
                      </button>
                    );
                  })}
                </div>
              </div>
              <label
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                  cursor: "pointer",
                  padding: "14px",
                  borderRadius: "12px",
                  background: "#121a2e",
                  border: "1px solid rgba(244,241,234,.1)",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.consent}
                  onChange={(e) => setForm((f) => ({ ...f, consent: e.target.checked }))}
                  style={{ width: "24px", height: "24px", flexShrink: 0, accentColor: "#e7b84e", marginTop: "1px" }}
                />
                <span style={{ fontSize: "16px", fontWeight: 600, lineHeight: 1.45 }}>
                  It&apos;s okay for someone from the church to contact me.
                </span>
              </label>
            </div>
          )}
        </div>
      )}

      {err && (
        <p role="alert" style={{ color: "#ffb3a5", fontWeight: 700, fontSize: "16px", lineHeight: 1.45 }}>
          {err}
        </p>
      )}
      <button onClick={onSubmit} style={goldButton}>
        Check In
      </button>
      <div style={{ textAlign: "center" }}>
        <button
          onClick={() => {
            setErr("");
            setFind((f) => ({ ...f, miss: false }));
            setScreen("find");
          }}
          style={linkButton}
        >
          Checked in before on another phone?
        </button>
      </div>
    </div>
  );
}

function Centered({ children, animate }: { children: ReactNode; animate?: boolean }) {
  return (
    <div
      className={animate ? "th-up" : undefined}
      style={{
        padding: "52px 22px 40px",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
        alignItems: "center",
      }}
    >
      {children}
    </div>
  );
}

function IconCircle({ children }: { children: ReactNode }) {
  return (
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
      {children}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}
