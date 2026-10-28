"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { submitFeedback, submitPrayer, type FeedbackResult } from "./actions";

const FB_TOPICS = [
  "General",
  "Sunday Service",
  "Kids & Youth",
  "Facilities",
  "Suggestion",
  "NT Gateway Improvement",
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

type Tab = "feedback" | "prayer";

const MAX_PHOTOS = 4;
// Per-photo cap after downscaling; 4 photos must fit Vercel's 4.5 MB request cap.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

/** Downscale a photo in the browser (max 1600px, JPEG) so phone-camera shots
 *  upload fast and up to 4 of them fit in one request. Falls back to the
 *  original file when the browser can't decode it (it's size-checked after). */
async function shrinkImage(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1600 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.82),
    );
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.[^.]*$/, "") + ".jpg", {
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}

function barCopy(tab: Tab) {
  return tab === "prayer"
    ? { title: "Prayer Request", subtitle: "We'll pray with you" }
    : { title: "Feedback", subtitle: "We're listening" };
}

export function FeedbackView({ initialTab }: { initialTab: Tab }) {
  const [tab, setTab] = useState<Tab>(initialTab);

  // feedback state
  const [rating, setRating] = useState(0);
  const [category, setCategory] = useState(FB_TOPICS[0]);
  const [fbName, setFbName] = useState("");
  const [message, setMessage] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const urls = photos.map((f) => URL.createObjectURL(f));
    setPreviews(urls);
    return () => urls.forEach((u) => URL.revokeObjectURL(u));
  }, [photos]);

  // prayer state
  const [prName, setPrName] = useState("");
  const [contact, setContact] = useState("");
  const [request, setRequest] = useState("");
  const [prVisibility, setPrVisibility] = useState<"pastoral" | "bishop">("pastoral");

  const [result, setResult] = useState<FeedbackResult | null>(null);
  const [pending, startTransition] = useTransition();

  function switchTab(next: Tab) {
    setTab(next);
    setResult(null);
    window.history.replaceState(null, "", next === "prayer" ? "/feedback?tab=prayer" : "/feedback");
  }

  async function onPickPhotos(list: FileList | null) {
    if (!list || list.length === 0) return;
    const incoming = [...list];
    if (photoInputRef.current) photoInputRef.current.value = "";
    setPhotoError(null);

    const room = MAX_PHOTOS - photos.length;
    if (incoming.length > room) {
      setPhotoError(`You can attach up to ${MAX_PHOTOS} photos.`);
    }
    const picked: File[] = [];
    for (const f of incoming.slice(0, Math.max(0, room))) {
      if (!f.type.startsWith("image/")) {
        setPhotoError("Photos must be image files (JPG, PNG, HEIC…).");
        continue;
      }
      const shrunk = await shrinkImage(f);
      if (shrunk.size > MAX_PHOTO_BYTES) {
        setPhotoError("One of those photos is too large — please keep each under 2 MB.");
        continue;
      }
      picked.push(shrunk);
    }
    if (picked.length > 0) setPhotos((p) => [...p, ...picked]);
  }

  function removePhotoAt(index: number) {
    setPhotos((p) => p.filter((_, i) => i !== index));
    setPhotoError(null);
  }

  function onSubmitFeedback() {
    startTransition(async () => {
      const form = new FormData();
      form.set("rating", String(rating));
      form.set("category", category);
      form.set("name", fbName);
      form.set("message", message);
      photos.forEach((p) => form.append("photos", p));
      try {
        const r = await submitFeedback(form);
        setResult(r);
      } catch {
        setResult({
          ok: false,
          error: "Something went wrong sending that — if you attached photos, try fewer or smaller ones.",
        });
      }
    });
  }

  function onSubmitPrayer() {
    startTransition(async () => {
      const r = await submitPrayer({
        kind: "prayer",
        name: prName,
        contact,
        request,
        visibility: prVisibility,
      });
      setResult(r);
    });
  }

  if (result?.ok) {
    const bar = barCopy(result.kind);
    const title = result.kind === "prayer" ? "We're Praying" : "Thank You";
    const msg =
      result.kind === "prayer"
        ? 'Your request has been received and our prayer team will stand with you in faith. "The prayer of a righteous person is powerful and effective."'
        : "We truly appreciate you taking the time. Your feedback goes straight to our team and helps us serve you better.";
    return (
      <PhoneShell>
        <div className="th-slide" style={{ minHeight: "100vh" }}>
          <BackBar title={bar.title} subtitle={bar.subtitle} />
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

  const bar = barCopy(tab);

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title={bar.title} subtitle={bar.subtitle} />

        <div style={{ padding: "16px 18px 0", display: "flex", gap: "8px" }}>
          <button type="button" onClick={() => switchTab("feedback")} style={tabStyle(tab === "feedback")}>
            Feedback
          </button>
          <button type="button" onClick={() => switchTab("prayer")} style={tabStyle(tab === "prayer")}>
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
              style={{ ...inputStyle, resize: "vertical", marginBottom: "12px" }}
            />

            {/* optional photos — handy for NT Gateway bug screenshots */}
            <input
              ref={photoInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => void onPickPhotos(e.target.files)}
              style={{ display: "none" }}
            />
            {photos.length === 0 ? (
              <button
                type="button"
                onClick={() => photoInputRef.current?.click()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  width: "100%",
                  marginBottom: "20px",
                  padding: "13px 14px",
                  borderRadius: "11px",
                  border: "1.5px dashed rgba(244,241,234,.2)",
                  background: "transparent",
                  color: "#9aa3b8",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="3" width="18" height="18" rx="3" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
                Add photos (optional · up to {MAX_PHOTOS})
              </button>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
                {previews.map((src, i) => (
                  <div key={src} style={{ position: "relative", width: "72px", height: "72px" }}>
                    {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                    <img
                      src={src}
                      alt={`Photo ${i + 1}`}
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                        borderRadius: "10px",
                        border: "1.5px solid rgba(244,241,234,.18)",
                        display: "block",
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => removePhotoAt(i)}
                      aria-label={`Remove photo ${i + 1}`}
                      style={{
                        position: "absolute",
                        top: "-8px",
                        right: "-8px",
                        width: "22px",
                        height: "22px",
                        borderRadius: "50%",
                        background: "#1a2438",
                        color: "#f4f1ea",
                        border: "1px solid rgba(244,241,234,.3)",
                        fontSize: "11px",
                        fontWeight: 800,
                        lineHeight: 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {photos.length < MAX_PHOTOS && (
                  <button
                    type="button"
                    onClick={() => photoInputRef.current?.click()}
                    aria-label="Add another photo"
                    style={{
                      width: "72px",
                      height: "72px",
                      borderRadius: "10px",
                      border: "1.5px dashed rgba(244,241,234,.25)",
                      background: "transparent",
                      color: "#9aa3b8",
                      fontSize: "24px",
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    +
                  </button>
                )}
              </div>
            )}
            {photoError && (
              <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginTop: "-10px", marginBottom: "12px" }}>
                {photoError}
              </div>
            )}
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
              style={{ ...inputStyle, resize: "vertical", marginBottom: "12px" }}
            />
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9aa3b8",
                marginBottom: "7px",
              }}
            >
              Who should see this?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "16px" }}>
              {(
                [
                  {
                    value: "pastoral",
                    label: "Bishop + Pastoral team",
                    sub: "The Bishop and our pastors pray together over your request",
                  },
                  {
                    value: "bishop",
                    label: "Bishop only",
                    sub: "Goes to the Bishop alone — no one else sees it",
                  },
                ] as const
              ).map((opt) => {
                const on = prVisibility === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setPrVisibility(opt.value)}
                    aria-pressed={on}
                    style={{
                      textAlign: "left",
                      background: on ? "rgba(231,184,78,.12)" : "#0b101c",
                      border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.14)"}`,
                      borderRadius: "11px",
                      padding: "12px 14px",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: "3px",
                    }}
                  >
                    <span style={{ fontSize: "14px", fontWeight: 800, color: on ? "#e7b84e" : "#f4f1ea" }}>
                      {opt.label}
                    </span>
                    <span style={{ fontSize: "12.5px", fontWeight: 500, color: "#9aa3b8", lineHeight: 1.4 }}>
                      {opt.sub}
                    </span>
                  </button>
                );
              })}
            </div>
            <div
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "flex-start",
                background: "rgba(231,184,78,.08)",
                border: "1px solid rgba(231,184,78,.25)",
                borderRadius: "11px",
                padding: "12px 14px",
                marginBottom: "22px",
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#e7b84e"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ flexShrink: 0, marginTop: "1px" }}
              >
                <path d="M12 3l7 3v5c0 4.5-3 8-7 10-4-2-7-5.5-7-10V6z" />
                <path d="M9.5 12l1.8 1.8 3.2-3.6" />
              </svg>
              <div style={{ fontSize: "13px", fontWeight: 600, color: "#cdd3e0", lineHeight: 1.45 }}>
                {prVisibility === "bishop"
                  ? "Your prayer request is confidential and goes only to the Bishop."
                  : "Your prayer request is confidential and goes only to the Bishop and our pastoral team."}
              </div>
            </div>
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
