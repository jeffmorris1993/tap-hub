"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveEvent, deleteEvent, type EventFormInput } from "./actions";

const CATEGORIES = ["Worship", "Youth", "Community"] as const;

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

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

type Initial = {
  id?: string;
  slug?: string;
  title?: string;
  description_long?: string;
  category?: "Worship" | "Youth" | "Community";
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string;
  allow_volunteers?: boolean;
  published?: boolean;
};

export function EventForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description_long ?? "");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(initial?.category ?? "Community");
  const [startsAt, setStartsAt] = useState(toLocalInputValue(initial?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(initial?.ends_at ?? null));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [allowVolunteers, setAllowVolunteers] = useState(initial?.allow_volunteers ?? true);
  const [published, setPublished] = useState(initial?.published ?? true);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: EventFormInput = {
      id: initial?.id,
      slug,
      title,
      description_long: description,
      category,
      starts_at_local: startsAt,
      ends_at_local: endsAt,
      location,
      allow_volunteers: allowVolunteers,
      published,
    };
    startTransition(async () => {
      const r = await saveEvent(payload);
      if (!r.ok) {
        setError(r.error);
        return;
      }
      router.push("/admin/events");
      router.refresh();
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this event? Signups will be removed too. This can't be undone.")) return;
    startTransition(async () => {
      await deleteEvent(initial.id as string);
    });
  }

  return (
    <form onSubmit={onSubmit} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} required />
      </div>

      <div>
        <label style={labelStyle}>Slug (URL)</label>
        <input
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
          placeholder="auto-generated from title"
          style={inputStyle}
        />
      </div>
      <div>
        <label style={labelStyle}>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as (typeof CATEGORIES)[number])}
          style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
        >
          {CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Starts at</label>
        <input
          type="datetime-local"
          value={startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          style={inputStyle}
          required
        />
      </div>
      <div>
        <label style={labelStyle}>Ends at (optional)</label>
        <input
          type="datetime-local"
          value={endsAt}
          onChange={(e) => setEndsAt(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Location</label>
        <input value={location} onChange={(e) => setLocation(e.target.value)} style={inputStyle} required />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Description</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={5}
          style={{ ...inputStyle, resize: "vertical" }}
          required
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#cdd3e0", fontSize: "13.5px" }}>
        <input
          type="checkbox"
          checked={allowVolunteers}
          onChange={(e) => setAllowVolunteers(e.target.checked)}
          style={{ width: "18px", height: "18px", accentColor: "#e7b84e" }}
        />
        Allow volunteer signups
      </label>
      <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#cdd3e0", fontSize: "13.5px" }}>
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          style={{ width: "18px", height: "18px", accentColor: "#e7b84e" }}
        />
        Published (visible on /events)
      </label>

      {error && (
        <div style={{ gridColumn: "1 / -1", color: "#ff8a8a", fontSize: "13px", fontWeight: 700 }}>{error}</div>
      )}

      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "8px" }}>
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
          {pending ? "Saving…" : initial?.id ? "Save changes" : "Create event"}
        </button>
        {initial?.id && (
          <button
            type="button"
            onClick={onDelete}
            disabled={pending}
            style={{
              background: "transparent",
              color: "#ff8a8a",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "12px 18px",
              borderRadius: "10px",
              border: "1px solid rgba(255,138,138,.3)",
              cursor: pending ? "wait" : "pointer",
              marginLeft: "auto",
            }}
          >
            Delete
          </button>
        )}
      </div>
    </form>
  );
}
