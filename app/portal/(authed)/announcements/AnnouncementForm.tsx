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
  sendPollResultsNow,
  type AnnouncementInput,
  type ApprovalStatus,
} from "./actions";
import { ANNOUNCEMENT_CATEGORIES, type AnnouncementCategory } from "../../../../lib/announcement-types";
import type { EventPickerOption } from "../../../../lib/event-picker";
import { useToast } from "../Toaster";
import { ConfirmDialog } from "../ConfirmDialog";

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
  kind?: "standard" | "poll";
  hero?: boolean;
  poll_closes_at?: string | null;
  poll_notify_emails?: string[] | null;
  poll_results_sent_at?: string | null;
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
  // Tells the browser to use dark-mode picker UI so date / time
  // controls are legible against the navy background.
  colorScheme: "dark",
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

/** ISO → the browser-local "YYYY-MM-DDTHH:MM" a datetime-local input wants
 *  (same pattern as the events form). */
function toLocalInputValue(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
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
  allowedCategories,
  pollOptions,
  pollVoteCount = 0,
}: {
  initial?: Initial;
  canApprove: boolean;
  events: EventPickerOption[];
  /** Leads only see their own ministries here; omitted = all categories. */
  allowedCategories?: string[];
  /** Existing poll option labels, in order. */
  pollOptions?: string[];
  /** Votes already cast — once > 0 the option list is locked. */
  pollVoteCount?: number;
}) {
  const categoryOptions = (allowedCategories?.length
    ? ANNOUNCEMENT_CATEGORIES.filter((c) => allowedCategories.includes(c))
    : ANNOUNCEMENT_CATEGORIES) as readonly AnnouncementCategory[];
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const [category, setCategory] = useState<AnnouncementCategory>(
    initial?.category ?? categoryOptions[0] ?? "General",
  );
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [dateLabel, setDateLabel] = useState(initial?.date_label ?? "");
  const [expiresAt, setExpiresAt] = useState(toLocalDate(initial?.expires_at ?? null));
  // Placement: normal / pinned-to-feed / homepage hero. Hero is pastoral-only
  // (the server strips it for other roles too).
  const [placement, setPlacement] = useState<"none" | "pinned" | "hero">(
    initial?.hero ? "hero" : initial?.pinned ? "pinned" : "none",
  );
  // Poll state
  const [isPoll, setIsPoll] = useState(initial?.kind === "poll");
  const [options, setOptions] = useState<string[]>(
    pollOptions && pollOptions.length > 0 ? pollOptions : ["", ""],
  );
  const [pollCloses, setPollCloses] = useState(toLocalInputValue(initial?.poll_closes_at ?? null));
  const [watchersRaw, setWatchersRaw] = useState((initial?.poll_notify_emails ?? []).join(", "));
  const optionsLocked = pollVoteCount > 0;
  // Page-load time is stable for the life of the form; lazy init keeps the
  // impure clock read out of render.
  const [loadedAtMs] = useState(() => Date.now());
  const pollClosed =
    initial?.kind === "poll" &&
    !!initial?.poll_closes_at &&
    Date.parse(initial.poll_closes_at) <= loadedAtMs;
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
  // While awaiting approval, only the approver may edit — the server enforces
  // the same rule in saveAnnouncement.
  const locked = isExisting && status === "pending" && !canApprove;

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
      pinned: placement === "pinned",
      link_url: finalLinkUrl,
      action_label: finalLinkUrl ? actionLabel || null : null,
      kind: isPoll ? "poll" : "standard",
      hero: placement === "hero",
      poll_closes_at_local: isPoll ? pollCloses || null : null,
      poll_options: isPoll ? options : [],
      poll_notify_emails_raw: isPoll ? watchersRaw : null,
    };
  }

  function onSendResults() {
    if (!initial?.id) return;
    startTransition(async () => {
      const r = await sendPollResultsNow(initial.id as string);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Results email sent.", "success");
      router.refresh();
    });
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
        router.push(`/portal/announcements/${r.id}?flash=announcement-saved`);
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
      router.push("/portal/announcements?flash=announcement-submitted");
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
      router.push("/portal/announcements?flash=announcement-approved");
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
      router.push("/portal/announcements?flash=announcement-rejected");
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
    setConfirmingDelete(true);
  }

  function confirmDelete() {
    if (!initial?.id) return;
    startTransition(async () => {
      try {
        sessionStorage.setItem("admin-flash", "announcement-deleted");
      } catch {}
      try {
        await deleteAnnouncement(initial.id as string);
      } catch (err) {
        setConfirmingDelete(false);
        toast(err instanceof Error ? err.message : "Couldn't delete.", "error");
      }
    });
  }

  return (
    <form onSubmit={onSave} className="p-2col" style={{ display: "grid", gap: "16px" }}>
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
      {locked && (
        <div
          style={{
            gridColumn: "1 / -1",
            background: "rgba(231,184,78,.08)",
            border: "1px solid rgba(231,184,78,.35)",
            borderRadius: "12px",
            padding: "12px 16px",
            color: "#e7b84e",
            fontSize: "13px",
            fontWeight: 600,
            lineHeight: 1.5,
          }}
        >
          Locked while awaiting approval — a pastor can approve it, or request changes to unlock edits.
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

      {/* display:contents keeps the grid layout while `disabled` propagates to
          every field when the announcement is locked for review. */}
      <fieldset disabled={locked} style={{ display: "contents", border: "none", margin: 0, padding: 0, minWidth: 0 }}>
      <div>
        <label style={labelStyle}>Category</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as AnnouncementCategory)}
          style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
        >
          {categoryOptions.map((c) => (
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
          <div className="p-2col" style={{ display: "grid", gap: "12px" }}>
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
          <div className="p-2col" style={{ display: "grid", gap: "12px" }}>
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

      {/* ───────── Poll builder ───────── */}
      <div
        style={{
          gridColumn: "1 / -1",
          background: "#0d1424",
          border: "1px solid rgba(244,241,234,.1)",
          borderRadius: "14px",
          padding: "16px",
        }}
      >
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            color: "#f4f1ea",
            fontSize: "14px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={isPoll}
            disabled={optionsLocked}
            onChange={(e) => setIsPoll(e.target.checked)}
            style={{ width: "18px", height: "18px", accentColor: "#e7b84e" }}
          />
          Make this a poll
          <span style={{ color: "#9aa3b8", fontWeight: 500, fontSize: "12.5px" }}>
            — readers vote, you get the results
          </span>
        </label>

        {isPoll && (
          <div style={{ marginTop: "14px", display: "grid", gap: "14px" }}>
            <div>
              <label style={labelStyle}>Options (2–8)</label>
              {optionsLocked && (
                <p style={{ color: "#e7b84e", fontSize: "12px", fontWeight: 700, margin: "0 0 8px" }}>
                  Options are locked — {pollVoteCount} {pollVoteCount === 1 ? "vote has" : "votes have"} already been cast.
                </p>
              )}
              <div style={{ display: "grid", gap: "8px" }}>
                {options.map((opt, i) => (
                  <div key={i} style={{ display: "flex", gap: "8px" }}>
                    <input
                      value={opt}
                      disabled={optionsLocked}
                      onChange={(e) =>
                        setOptions((prev) => prev.map((o, j) => (j === i ? e.target.value : o)))
                      }
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder={`Option ${i + 1} — e.g. "🎤 Family Feud"`}
                    />
                    {!optionsLocked && options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                        aria-label={`Remove option ${i + 1}`}
                        style={{
                          background: "transparent",
                          border: "1px solid rgba(244,241,234,.14)",
                          borderRadius: "9px",
                          color: "#9aa3b8",
                          fontSize: "15px",
                          width: "42px",
                          cursor: "pointer",
                        }}
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>
              {!optionsLocked && options.length < 8 && (
                <button
                  type="button"
                  onClick={() => setOptions((prev) => [...prev, ""])}
                  style={{
                    marginTop: "9px",
                    background: "transparent",
                    border: "1px solid rgba(244,241,234,.18)",
                    borderRadius: "9px",
                    color: "#cdd3e0",
                    fontSize: "12px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "8px 14px",
                    cursor: "pointer",
                  }}
                >
                  + Add option
                </button>
              )}
            </div>

            <div className="p-2col" style={{ display: "grid", gap: "12px" }}>
              <div>
                <label style={labelStyle}>Voting closes</label>
                <input
                  type="datetime-local"
                  value={pollCloses}
                  onChange={(e) => setPollCloses(e.target.value)}
                  style={inputStyle}
                />
                <p style={{ color: "#9aa3b8", fontSize: "11.5px", marginTop: "5px" }}>
                  Voting opens when the announcement is approved.
                </p>
              </div>
              <div>
                <label style={labelStyle}>Send results to (optional)</label>
                <input
                  value={watchersRaw}
                  onChange={(e) => setWatchersRaw(e.target.value)}
                  style={inputStyle}
                  placeholder="email@nehtemple.org, another@nehtemple.org"
                />
                <p style={{ color: "#9aa3b8", fontSize: "11.5px", marginTop: "5px" }}>
                  You (the creator) always get the results email when voting closes.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ───────── Placement ───────── */}
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Placement</label>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {(
            [
              { v: "none", label: "Normal" },
              { v: "pinned", label: "📌 Pin to feed" },
              ...(canApprove ? [{ v: "hero", label: "★ Feature on homepage" }] : []),
            ] as { v: "none" | "pinned" | "hero"; label: string }[]
          ).map(({ v, label }) => {
            const on = placement === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setPlacement(v)}
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
        {placement === "hero" && (
          <p style={{ color: "#9aa3b8", fontSize: "11.5px", marginTop: "6px" }}>
            Shows as the big featured card at the top of the Gateway home. One at a time — the newest featured announcement wins.
          </p>
        )}
      </div>
      </fieldset>

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
        {!locked && (
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
        )}
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
        {initial?.id && pollClosed && !initial?.poll_results_sent_at && (
          <button
            type="button"
            onClick={onSendResults}
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
              cursor: pending ? "wait" : "pointer",
            }}
          >
            Send results now
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

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this announcement?"
        body="This can't be undone."
        confirmLabel="Delete announcement"
        danger
        pending={pending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={confirmDelete}
      />
    </form>
  );
}
