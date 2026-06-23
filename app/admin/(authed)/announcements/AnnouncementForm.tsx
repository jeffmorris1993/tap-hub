"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAnnouncement, deleteAnnouncement, type AnnouncementInput } from "./actions";
import { ANNOUNCEMENT_CATEGORIES, type AnnouncementCategory } from "../../../../lib/announcement-types";
import { useToast } from "../Toaster";

type Initial = {
  id?: string;
  category?: AnnouncementCategory;
  title?: string;
  body?: string;
  date_label?: string | null;
  expires_at?: string | null;
  pinned?: boolean;
  published?: boolean;
  link_url?: string | null;
  action_label?: string | null;
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
  fontFamily: "inherit",
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

function toLocalDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function AnnouncementForm({ initial }: { initial?: Initial }) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [category, setCategory] = useState<AnnouncementCategory>(initial?.category ?? "Ministry");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [dateLabel, setDateLabel] = useState(initial?.date_label ?? "");
  const [expiresAt, setExpiresAt] = useState(toLocalDate(initial?.expires_at ?? null));
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [published, setPublished] = useState(initial?.published ?? true);
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? "");
  const [actionLabel, setActionLabel] = useState(initial?.action_label ?? "");

  function buildPayload(): AnnouncementInput {
    return {
      id: initial?.id,
      category,
      title,
      body,
      date_label: dateLabel || null,
      expires_at: expiresAt
        ? new Date(expiresAt + "T23:59:59").toISOString()
        : null,
      pinned,
      published,
      link_url: linkUrl || null,
      action_label: actionLabel || null,
    };
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const r = await saveAnnouncement(buildPayload());
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      if (!initial?.id) {
        router.push(`/admin/announcements?flash=announcement-saved`);
      } else {
        toast("Announcement saved.", "success");
        router.refresh();
      }
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    if (!confirm("Delete this announcement? This can't be undone.")) return;
    startTransition(async () => {
      try {
        sessionStorage.setItem("admin-flash", "announcement-deleted");
      } catch {}
      try {
        await deleteAnnouncement(initial.id as string);
      } catch (err) {
        toast(err instanceof Error ? err.message : "Couldn't delete.", "error");
      }
    });
  }

  return (
    <form onSubmit={onSave} style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
      <div>
        <label style={labelStyle}>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
          style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
        >
          {ANNOUNCEMENT_CATEGORIES.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label style={labelStyle}>Auto-hide after (optional)</label>
        <input
          type="date"
          value={expiresAt}
          onChange={(e) => setExpiresAt(e.target.value)}
          style={inputStyle}
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} required />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Body</label>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={5}
          style={{ ...inputStyle, resize: "vertical" }}
          required
        />
      </div>

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Display date / when (optional)</label>
        <input
          value={dateLabel}
          onChange={(e) => setDateLabel(e.target.value)}
          style={inputStyle}
          placeholder='e.g. "Sun, Mar 1 · 10:30 AM" or "Jan 6 – 26, 2026"'
        />
      </div>

      <div>
        <label style={labelStyle}>Action link (optional)</label>
        <input
          value={linkUrl}
          onChange={(e) => setLinkUrl(e.target.value)}
          style={inputStyle}
          placeholder="/events or https://…"
        />
      </div>

      <div>
        <label style={labelStyle}>Action button label</label>
        <input
          value={actionLabel}
          onChange={(e) => setActionLabel(e.target.value)}
          style={inputStyle}
          placeholder="Learn more"
        />
      </div>

      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#cdd3e0",
          fontSize: "13.5px",
        }}
      >
        <input
          type="checkbox"
          checked={pinned}
          onChange={(e) => setPinned(e.target.checked)}
          style={{ width: "18px", height: "18px", accentColor: "#e7b84e" }}
        />
        Pin to the top
      </label>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#cdd3e0",
          fontSize: "13.5px",
        }}
      >
        <input
          type="checkbox"
          checked={published}
          onChange={(e) => setPublished(e.target.checked)}
          style={{ width: "18px", height: "18px", accentColor: "#e7b84e" }}
        />
        Published (visible on the public site)
      </label>

      <div
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          gap: "10px",
          marginTop: "8px",
          flexWrap: "wrap",
        }}
      >
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
          {pending ? "Saving…" : initial?.id ? "Save changes" : "Create announcement"}
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
