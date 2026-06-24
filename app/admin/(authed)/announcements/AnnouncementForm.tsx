"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveAnnouncement,
  submitAnnouncementForApproval,
  approveAnnouncement,
  rejectAnnouncement,
  unpublishAnnouncement,
  republishAnnouncement,
  deleteAnnouncement,
  type AnnouncementInput,
  type ApprovalStatus,
} from "./actions";
import { ANNOUNCEMENT_CATEGORIES, type AnnouncementCategory } from "../../../../lib/announcement-types";
import type { EventPickerOption } from "../../../../lib/event-picker";
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
  approval_status?: ApprovalStatus;
  approval_notes?: string | null;
  submitted_by?: string | null;
  reviewed_by?: string | null;
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

const STATUS_STYLES: Record<ApprovalStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: "rgba(154,163,184,.16)", color: "#cdd3e0", label: "Draft" },
  pending: { bg: "rgba(231,184,78,.16)", color: "#e7b84e", label: "Awaiting approval" },
  approved: { bg: "rgba(78,184,107,.16)", color: "#7ed996", label: "Approved" },
  rejected: { bg: "rgba(181,50,65,.16)", color: "#ff8a8a", label: "Revisions requested" },
};

function toLocalDate(iso: string | null | undefined): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

function eventSlugFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const m = url.match(/^\/events\/([a-z0-9-]+)$/);
  return m ? m[1] : null;
}

export function AnnouncementForm({
  initial,
  canApprove,
  events,
}: {
  initial?: Initial;
  canApprove: boolean;
  events: EventPickerOption[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");

  const [category, setCategory] = useState<AnnouncementCategory>(initial?.category ?? "Ministry");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [dateLabel, setDateLabel] = useState(initial?.date_label ?? "");
  const [expiresAt, setExpiresAt] = useState(toLocalDate(initial?.expires_at ?? null));
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  // Action link can be one of three modes: a specific event (auto-fills the
  // URL), a custom URL, or none. If we're editing an existing announcement
  // whose link_url already points at /events/<slug>, default into "event"
  // mode with that event preselected.
  const initialLinkUrl = initial?.link_url ?? "";
  const initialEventSlug = eventSlugFromUrl(initialLinkUrl);
  const initialMode: "none" | "event" | "custom" = initialLinkUrl
    ? initialEventSlug
      ? "event"
      : "custom"
    : "none";
  const [linkMode, setLinkMode] = useState<"none" | "event" | "custom">(initialMode);
  const [linkEventSlug, setLinkEventSlug] = useState<string>(initialEventSlug ?? "");
  const [linkUrl, setLinkUrl] = useState(initialMode === "custom" ? initialLinkUrl : "");
  const [actionLabel, setActionLabel] = useState(initial?.action_label ?? "");

  const status: ApprovalStatus = initial?.approval_status ?? "draft";
  const statusStyle = STATUS_STYLES[status];
  const isExisting = !!initial?.id;
  const canSubmit = !isExisting || status === "draft" || status === "rejected";

  function buildPayload(): AnnouncementInput {
    let finalLinkUrl: string | null = null;
    if (linkMode === "event" && linkEventSlug) {
      finalLinkUrl = `/events/${linkEventSlug}`;
    } else if (linkMode === "custom" && linkUrl.trim()) {
      finalLinkUrl = linkUrl.trim();
    }
    return {
      id: initial?.id,
      category,
      title,
      body,
      date_label: dateLabel || null,
      expires_at: expiresAt ? new Date(expiresAt + "T23:59:59").toISOString() : null,
      pinned,
      link_url: finalLinkUrl,
      action_label: finalLinkUrl ? actionLabel || null : null,
    };
  }

  async function ensureSaved(): Promise<string | null> {
    const r = await saveAnnouncement(buildPayload());
    if (!r.ok) {
      toast(r.error, "error");
      return null;
    }
    return r.id;
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
        router.push(`/admin/announcements/${r.id}?flash=announcement-saved`);
      } else {
        toast("Announcement saved.", "success");
        router.refresh();
      }
    });
  }

  function onSubmitForApproval() {
    startTransition(async () => {
      const id = await ensureSaved();
      if (!id) return;
      const r = await submitAnnouncementForApproval(id);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      router.push("/admin/announcements?flash=announcement-submitted");
    });
  }

  function onApprove() {
    if (!initial?.id) return;
    startTransition(async () => {
      const r = await approveAnnouncement(initial.id as string);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      router.push("/admin/announcements?flash=announcement-approved");
    });
  }

  function onReject() {
    if (!initial?.id) return;
    if (!showRejectBox) {
      setShowRejectBox(true);
      return;
    }
    startTransition(async () => {
      const r = await rejectAnnouncement(initial.id as string, rejectNotes);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      router.push("/admin/announcements?flash=announcement-rejected");
    });
  }

  function onUnpublish() {
    if (!initial?.id) return;
    startTransition(async () => {
      const r = await unpublishAnnouncement(initial.id as string);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Announcement unpublished.", "success");
      router.refresh();
    });
  }

  function onRepublish() {
    if (!initial?.id) return;
    startTransition(async () => {
      const r = await republishAnnouncement(initial.id as string);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Announcement republished.", "success");
      router.refresh();
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
      {/* Status banner */}
      {isExisting && (
        <div style={{ gridColumn: "1 / -1", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
          <span
            style={{
              background: statusStyle.bg,
              color: statusStyle.color,
              fontSize: "11.5px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              padding: "6px 11px",
              borderRadius: "7px",
            }}
          >
            {statusStyle.label}
          </span>
          {initial?.submitted_by && (
            <span style={{ color: "#9aa3b8", fontSize: "12.5px" }}>
              Submitted by {initial.submitted_by}
            </span>
          )}
          {initial?.published && status === "approved" && (
            <span
              style={{
                background: "rgba(78,184,107,.15)",
                color: "#7ed996",
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "4px 9px",
                borderRadius: "6px",
              }}
            >
              Live on /announcements
            </span>
          )}
        </div>
      )}
      {status === "rejected" && initial?.approval_notes && (
        <div
          style={{
            gridColumn: "1 / -1",
            background: "rgba(181,50,65,.08)",
            border: "1px solid rgba(181,50,65,.35)",
            borderRadius: "12px",
            padding: "14px 16px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#ff8a8a",
              marginBottom: "6px",
            }}
          >
            Notes from {initial.reviewed_by ?? "the approver"}
          </div>
          <div style={{ color: "#f4f1ea", fontSize: "14px", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {initial.approval_notes}
          </div>
        </div>
      )}

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

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Action button (optional)</label>
        <div style={{ display: "flex", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
          {(["none", "event", "custom"] as const).map((m) => {
            const on = linkMode === m;
            const label = m === "none" ? "No button" : m === "event" ? "Link to an event" : "Custom URL";
            return (
              <button
                key={m}
                type="button"
                onClick={() => setLinkMode(m)}
                style={{
                  background: on ? "#e7b84e" : "#1a2438",
                  color: on ? "#0b101c" : "#cdd3e0",
                  border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
                  fontWeight: 800,
                  fontSize: "12px",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  padding: "9px 14px",
                  borderRadius: "9px",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        {linkMode === "event" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <select
                value={linkEventSlug}
                onChange={(e) => {
                  setLinkEventSlug(e.target.value);
                  if (!actionLabel.trim()) setActionLabel("Sign up");
                }}
                style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
              >
                <option value="">— Choose an event —</option>
                {events.map((ev) => (
                  <option key={ev.slug} value={ev.slug}>
                    {ev.title} · {ev.startsAtLabel}
                  </option>
                ))}
              </select>
              {events.length === 0 && (
                <p style={{ fontSize: "12px", color: "#9aa3b8", marginTop: "6px" }}>
                  No published events yet — create one first or use Custom URL.
                </p>
              )}
            </div>
            <input
              value={actionLabel}
              onChange={(e) => setActionLabel(e.target.value)}
              style={inputStyle}
              placeholder='Button text — e.g. "Sign up"'
            />
          </div>
        )}

        {linkMode === "custom" && (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <input
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              style={inputStyle}
              placeholder="https://…"
            />
            <input
              value={actionLabel}
              onChange={(e) => setActionLabel(e.target.value)}
              style={inputStyle}
              placeholder='Button text — e.g. "Learn more"'
            />
          </div>
        )}
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

      {/* Action bar */}
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
            background: "#1a2438",
            color: "#cdd3e0",
            fontWeight: 800,
            fontSize: "13px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "12px 22px",
            borderRadius: "10px",
            border: "1px solid rgba(244,241,234,.14)",
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Saving…" : isExisting ? "Save changes" : "Save draft"}
        </button>
        {canSubmit && (
          <button
            type="button"
            onClick={onSubmitForApproval}
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
            {canApprove ? "Publish" : "Submit for approval"}
          </button>
        )}
        {canApprove && status === "pending" && (
          <>
            <button
              type="button"
              onClick={onApprove}
              disabled={pending}
              style={{
                background: "rgba(78,184,107,.22)",
                color: "#7ed996",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "12px 22px",
                borderRadius: "10px",
                border: "1px solid rgba(78,184,107,.4)",
                cursor: pending ? "wait" : "pointer",
              }}
            >
              Approve
            </button>
            <button
              type="button"
              onClick={onReject}
              disabled={pending}
              style={{
                background: "rgba(181,50,65,.18)",
                color: "#ff8a8a",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "12px 22px",
                borderRadius: "10px",
                border: "1px solid rgba(181,50,65,.4)",
                cursor: pending ? "wait" : "pointer",
              }}
            >
              {showRejectBox ? "Send rejection" : "Reject…"}
            </button>
          </>
        )}
        {canApprove && status === "approved" && initial?.published && (
          <button
            type="button"
            onClick={onUnpublish}
            disabled={pending}
            style={{
              background: "transparent",
              color: "#cdd3e0",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "12px 22px",
              borderRadius: "10px",
              border: "1px solid rgba(244,241,234,.14)",
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            Unpublish
          </button>
        )}
        {canApprove && status === "approved" && !initial?.published && (
          <button
            type="button"
            onClick={onRepublish}
            disabled={pending}
            style={{
              background: "#1a2438",
              color: "#e7b84e",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "12px 22px",
              borderRadius: "10px",
              border: "1px solid rgba(231,184,78,.4)",
              cursor: "pointer",
              marginLeft: "auto",
            }}
          >
            Republish
          </button>
        )}
        {canApprove && initial?.id && (
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
            }}
          >
            Delete
          </button>
        )}
      </div>

      {/* Reject notes box */}
      {showRejectBox && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Rejection notes (sent to submitter)</label>
          <textarea
            value={rejectNotes}
            onChange={(e) => setRejectNotes(e.target.value)}
            rows={4}
            placeholder="What needs to change before this can be approved?"
            style={{ ...inputStyle, resize: "vertical" }}
            autoFocus
          />
          <div style={{ marginTop: "8px", color: "#9aa3b8", fontSize: "12.5px" }}>
            Click <strong>Reject…</strong> a second time to send.
          </div>
        </div>
      )}
    </form>
  );
}
