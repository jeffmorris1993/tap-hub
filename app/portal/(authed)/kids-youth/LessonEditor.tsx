"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveLesson } from "./actions";

type LessonRow = {
  id: string;
  lesson_date: string;
  topic: string;
  reference: string;
  teacher: string;
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "10px",
  fontSize: "14.5px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9aa3b8",
  marginBottom: "6px",
};

function todayIso() {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

export function LessonEditor({ recent }: { recent: LessonRow[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [date, setDate] = useState(todayIso());
  const [topic, setTopic] = useState("");
  const [reference, setReference] = useState("");
  const [teacher, setTeacher] = useState("");

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await saveLesson({ lesson_date: date, topic, reference, teacher });
      if (!r.ok) {
        setError(r.error ?? "Failed to save");
        return;
      }
      setTopic("");
      setReference("");
      setTeacher("");
      router.refresh();
    });
  }

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          marginBottom: "6px",
        }}
      >
        Kids + Youth
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "14px", marginBottom: "28px" }}>
        Post this week&apos;s Ignite lesson. The most recent lesson on or before today shows in &ldquo;Teaching
        Today&rdquo; on <code style={{ color: "#cdd3e0" }}>/kids-youth</code>.
      </p>

      <form
        onSubmit={onSubmit}
        style={{
          background: "#121a2e",
          border: "1px solid rgba(244,241,234,.08)",
          borderRadius: "14px",
          padding: "20px",
          display: "grid",
          gridTemplateColumns: "150px 1fr 1fr",
          gap: "14px",
          marginBottom: "32px",
        }}
      >
        <div>
          <label style={labelStyle}>Lesson date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={inputStyle}
            required
          />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>Topic</label>
          <input value={topic} onChange={(e) => setTopic(e.target.value)} style={inputStyle} required />
        </div>
        <div>
          <label style={labelStyle}>Reference</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="Eph 6:10–18"
            style={inputStyle}
            required
          />
        </div>
        <div style={{ gridColumn: "span 2" }}>
          <label style={labelStyle}>Teacher / context</label>
          <input
            value={teacher}
            onChange={(e) => setTeacher(e.target.value)}
            placeholder="Standing firm in faith · Led by the Ignite team"
            style={inputStyle}
          />
        </div>
        {error && (
          <div style={{ gridColumn: "1 / -1", color: "#ff8a8a", fontSize: "13px", fontWeight: 700 }}>{error}</div>
        )}
        <div style={{ gridColumn: "1 / -1" }}>
          <button
            type="submit"
            disabled={pending}
            style={{
              background: "#e7b84e",
              color: "#0b101c",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "12px 22px",
              borderRadius: "10px",
              border: "none",
              cursor: pending ? "wait" : "pointer",
              opacity: pending ? 0.7 : 1,
            }}
          >
            {pending ? "Saving…" : "Post lesson"}
          </button>
        </div>
      </form>

      <h2
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "20px",
          marginBottom: "12px",
        }}
      >
        Recent lessons
      </h2>
      {recent.length === 0 ? (
        <div style={{ color: "#9aa3b8", fontSize: "13.5px" }}>None yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {recent.map((r) => (
            <div
              key={r.id}
              style={{
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "10px",
                padding: "14px 16px",
                display: "grid",
                gridTemplateColumns: "120px 1fr 1fr 1fr",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div style={{ color: "#9aa3b8", fontSize: "12.5px", fontWeight: 700 }}>{r.lesson_date}</div>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>{r.topic}</div>
              <div style={{ color: "#cdd3e0", fontSize: "13px" }}>{r.reference}</div>
              <div style={{ color: "#9aa3b8", fontSize: "12.5px" }}>{r.teacher}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
