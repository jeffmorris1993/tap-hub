"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { submitFeedback, submitPrayer, type FeedbackResult } from "./actions";

const FB_TOPICS = ["General", "Sunday Service", "Kids & Youth", "Facilities", "Suggestion"];

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

function tabStyle(on: boolean): React.CSSProperties {
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

export default function Feedback() {
  const [tab, setTab] = useState<"feedback" | "prayer">("feedback");

  // feedback state
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState(FB_TOPICS[0]);
  const [fbName, setFbName] = useState("");
  const [message, setMessage] = useState("");

  // prayer state
  const [prName, setPrName] = useState("");
  const [contact, setContact] = useState("");
  const [request, setRequest] = useState("");
  const [confidential, setConfidential] = useState(true);
  const [prayerWall, setPrayerWall] = useState(false);

  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [pending, startTransition] = useTransition();

  function onSubmitFeedback() {
    startTransition(async () => {
      const r = await submitFeedback({
        kind: "feedback",
        rating,
        category,
        name: fbName,
        message,
      });
      setResult(r);
    });
  }

  function onSubmitPrayer() {
    startTransition(async () => {
      const r = await submitPrayer({
        kind: "prayer",
        name: prName,
        contact,
        request,
        confidential,
        prayerWall,
      });
      setResult(r);
    });
  }

  if (result?.ok) {
    const title = result.kind === "prayer" ? "We're Praying" : "Thank You";
    const msg =
      result.kind === "prayer"
        ? 'Your request has been received and our prayer team will stand with you in faith. "The prayer of a righteous person is powerful and effective."'
        : "We truly appreciate you taking the time. Your feedback goes straight to our team and helps us serve you better.";
    return (
      <PhoneShell>
        <div className="th-slide" style={{ minHeight: "100vh" }}>
          <BackBar title="Feedback / Prayer" subtitle="We're listening" />
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
              {title}
            </h3>
            <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 500, lineHeight: 1.6, marginTop: "12px" }}>
              {msg}
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
        </div>
      </PhoneShell>
    );
  }

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="Feedback / Prayer" subtitle="We're listening" />

        <div style={{ padding: "16px 18px 0", display: "flex", gap: "8px" }}>
          <button type="button" onClick={() => { setTab("feedback"); setResult(null); }} style={tabStyle(tab === "feedback")}>
            Feedback
          </button>
          <button type="button" onClick={() => { setTab("prayer"); setResult(null); }} style={tabStyle(tab === "prayer")}>
            Prayer Request
          </button>
        </div>

        {tab === "feedback" ? (
          <div style={{ padding: "18px 18px 40px" }}>
            <p style={{ color: "#9aa3b8", fontSize: "14px", fontWeight: 500, lineHeight: 1.55, marginBottom: "20px" }}>
              How are we doing? Your honest feedback helps us serve our church family better.
            </p>

            <label style={{ ...labelStyle, marginBottom: "9px" }}>How was your experience?</label>
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(n)}
                  aria-label={`${n} star`}
                  style={{ background: "none", border: "none", cursor: "pointer", padding: "2px" }}
                >
                  <svg width="34" height="34" viewBox="0 0 24 24" fill={n <= rating ? "#e7b84e" : "none"} stroke="#e7b84e" strokeWidth="1.4">
                    <path d="M12 3l2.5 5.5L20 9.3l-4 4 1 5.7L12 16.5 7 19l1-5.7-4-4 5.5-.8z" />
                  </svg>
                </button>
              ))}
            </div>

            <label style={{ ...labelStyle, marginBottom: "8px" }}>Topic</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                ...inputStyle,
                marginBottom: "16px",
                WebkitAppearance: "none",
                appearance: "none",
                fontWeight: 600,
              }}
            >
              {FB_TOPICS.map((t) => (
                <option key={t}>{t}</option>
              ))}
            </select>

            <input
              value={fbName}
              onChange={(e) => setFbName(e.target.value)}
              placeholder="Your name (optional)"
              style={{ ...inputStyle, marginBottom: "12px" }}
            />
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Tell us what's on your mind..."
              style={{ ...inputStyle, resize: "vertical", marginBottom: "20px" }}
            />
            {result && !result.ok && (
              <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>
                {result.error}
              </div>
            )}
            <button
              type="button"
              onClick={onSubmitFeedback}
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
              {pending ? "Sending…" : "Send Feedback"}
            </button>
          </div>
        ) : (
          <div style={{ padding: "18px 18px 40px" }}>
            <p style={{ color: "#9aa3b8", fontSize: "14px", fontWeight: 500, lineHeight: 1.55, marginBottom: "20px" }}>
              Our prayer team would be honored to stand with you. No request is too big or too small.
            </p>

            <input
              value={prName}
              onChange={(e) => setPrName(e.target.value)}
              placeholder="Your name"
              style={{ ...inputStyle, marginBottom: "12px" }}
            />
            <input
              value={contact}
              onChange={(e) => setContact(e.target.value)}
              placeholder="Email or phone (optional)"
              style={{ ...inputStyle, marginBottom: "12px" }}
            />
            <textarea
              value={request}
              onChange={(e) => setRequest(e.target.value)}
              rows={4}
              placeholder="How can we pray for you?"
              style={{ ...inputStyle, resize: "vertical", marginBottom: "16px" }}
            />
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#9aa3b8",
                cursor: "pointer",
                marginBottom: "12px",
              }}
            >
              <input
                type="checkbox"
                checked={confidential}
                onChange={(e) => setConfidential(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#e7b84e", cursor: "pointer" }}
              />
              Keep confidential (pastoral team only)
            </label>
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: "11px",
                fontSize: "13.5px",
                fontWeight: 600,
                color: "#9aa3b8",
                cursor: "pointer",
                marginBottom: "22px",
              }}
            >
              <input
                type="checkbox"
                checked={prayerWall}
                onChange={(e) => setPrayerWall(e.target.checked)}
                style={{ width: "18px", height: "18px", accentColor: "#e7b84e", cursor: "pointer" }}
              />
              Add to our church prayer wall
            </label>
            {result && !result.ok && (
              <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>
                {result.error}
              </div>
            )}
            <button
              type="button"
              onClick={onSubmitPrayer}
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
              {pending ? "Sending…" : "Send Prayer Request"}
            </button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
