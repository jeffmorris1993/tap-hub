"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  saveEvent,
  submitForApproval,
  approveEvent,
  rejectEvent,
  deleteEvent,
  unpublishEvent,
  republishEvent,
  type EventFormInput,
} from "./actions";
import { useToast } from "../Toaster";
import { ConfirmDialog } from "../ConfirmDialog";

const CATEGORIES = ["Youth", "Sisterhood", "Brotherhood", "Marriage", "General"] as const;
const RECURRENCE_KINDS = [
  { value: "none", label: "Doesn't repeat" },
  { value: "daily", label: "Every day (multi-day event)" },
  { value: "weekdays", label: "Every weekday (Mon–Fri)" },
  { value: "weekly", label: "Every week" },
  { value: "biweekly", label: "Every 2 weeks" },
  { value: "monthly", label: "Every month" },
] as const;
const DOW_OPTIONS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
];

type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "10px",
  fontSize: "14.5px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
  // Tells the browser to draw native UI (date picker indicator,
  // calendar overlay, default value placeholder) using dark-mode
  // colors so they're legible against the navy background.
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

function toLocalInputValue(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

const STATUS_STYLES: Record<ApprovalStatus, { bg: string; color: string; label: string }> = {
  draft: { bg: "rgba(154,163,184,.16)", color: "#cdd3e0", label: "Draft" },
  pending: { bg: "rgba(231,184,78,.16)", color: "#e7b84e", label: "Awaiting approval" },
  approved: { bg: "rgba(78,184,107,.16)", color: "#7ed996", label: "Approved" },
  rejected: { bg: "rgba(181,50,65,.16)", color: "#ff8a8a", label: "Revisions requested" },
};

type Initial = {
  id?: string;
  slug?: string;
  title?: string;
  description_long?: string;
  category?: "Youth" | "Sisterhood" | "Brotherhood" | "Marriage" | "General";
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string;
  cost?: string | null;
  accepts_rsvps?: boolean;
  allow_volunteers?: boolean;
  registration_url?: string | null;
  registration_label?: string | null;
  published?: boolean;
  approval_status?: ApprovalStatus;
  approval_notes?: string | null;
  submitted_by?: string | null;
  reviewed_by?: string | null;
  recurrence_kind?: "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly";
  recurrence_byday?: number | null;
  recurrence_until?: string | null;
};

export function EventForm({
  initial,
  canApprove,
}: {
  initial?: Initial;
  canApprove: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  function fail(msg: string) {
    setError(msg);
    toast(msg, "error");
  }

  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description_long ?? "");
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(initial?.category ?? "General");
  const [startsAt, setStartsAt] = useState(toLocalInputValue(initial?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(initial?.ends_at ?? null));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [acceptsRsvps, setAcceptsRsvps] = useState(initial?.accepts_rsvps ?? true);
  const [allowVolunteers, setAllowVolunteers] = useState(initial?.allow_volunteers ?? true);
  const [cost, setCost] = useState(initial?.cost ?? "");
  const [registrationUrl, setRegistrationUrl] = useState(initial?.registration_url ?? "");
  const [registrationLabel, setRegistrationLabel] = useState(initial?.registration_label ?? "");
  const [recurrenceKind, setRecurrenceKind] = useState<"none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly">(
    initial?.recurrence_kind ?? "none",
  );
  const [recurrenceByday, setRecurrenceByday] = useState<number | null>(initial?.recurrence_byday ?? null);
  const [recurrenceUntil, setRecurrenceUntil] = useState<string>(initial?.recurrence_until ?? "");

  const status = (initial?.approval_status ?? "draft") as ApprovalStatus;
  const statusStyle = STATUS_STYLES[status];
  const isExisting = !!initial?.id;
  const canSubmit = !isExisting || status === "draft" || status === "rejected";

  function buildPayload(): EventFormInput {
    return {
      id: initial?.id,
      slug,
      title,
      description_long: description,
      category,
      starts_at_local: startsAt,
      ends_at_local: endsAt,
      location,
      accepts_rsvps: acceptsRsvps,
      allow_volunteers: allowVolunteers,
      registration_url: registrationUrl.trim() || null,
      registration_label: registrationLabel.trim() || null,
      cost: cost.trim() || null,
      recurrence_kind: recurrenceKind,
      recurrence_byday: recurrenceKind === "weekly" || recurrenceKind === "biweekly" ? recurrenceByday : null,
      recurrence_until: recurrenceUntil || null,
    };
  }

  function onSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const r = await saveEvent(buildPayload());
      if (!r.ok) {
        fail(r.error);
        return;
      }
      if (!initial?.id) {
        router.push(`/admin/events/${r.id}?flash=event-saved`);
      } else {
        toast("Event saved.", "success");
        router.refresh();
      }
    });
  }

  function onSubmitForApproval() {
    setError(null);
    startTransition(async () => {
      const saveResult = await saveEvent(buildPayload());
      if (!saveResult.ok) {
        fail(saveResult.error);
        return;
      }
      const r = await submitForApproval(saveResult.id);
      if (!r.ok) {
        fail(r.error);
        return;
      }
      router.push("/admin/events?flash=event-submitted");
    });
  }

  function onApprove() {
    if (!initial?.id) return;
    setError(null);
    startTransition(async () => {
      const r = await approveEvent(initial.id as string);
      if (!r.ok) {
        fail(r.error);
        return;
      }
      router.push("/admin/events?flash=event-approved");
    });
  }

  function onReject() {
    if (!initial?.id) return;
    setError(null);
    if (!showRejectBox) {
      setShowRejectBox(true);
      return;
    }
    startTransition(async () => {
      const r = await rejectEvent(initial.id as string, rejectNotes);
      if (!r.ok) {
        fail(r.error);
        return;
      }
      router.push("/admin/events?flash=event-rejected");
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    setConfirmingDelete(true);
  }

  function confirmDelete() {
    if (!initial?.id) return;
    startTransition(async () => {
      // deleteEvent server-redirects to /admin/events — append the flash
      // via session storage so the destination page can show the toast.
      try {
        sessionStorage.setItem("admin-flash", "event-deleted");
      } catch {}
      await deleteEvent(initial.id as string);
    });
  }

  function onUnpublish() {
    if (!initial?.id) return;
    startTransition(async () => {
      const r = await unpublishEvent(initial.id as string);
      if (!r.ok) {
        fail(r.error);
        return;
      }
      toast("Event unpublished.", "success");
      router.refresh();
    });
  }

  function onRepublish() {
    if (!initial?.id) return;
    startTransition(async () => {
      const r = await republishEvent(initial.id as string);
      if (!r.ok) {
        fail(r.error);
        return;
      }
      toast("Event republished.", "success");
      router.refresh();
    });
  }

  const needsBydayPicker = recurrenceKind === "weekly" || recurrenceKind === "biweekly";

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
              Live on /events
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
          <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ff8a8a", marginBottom: "6px" }}>
            Notes from {initial.reviewed_by ?? "the approver"}
          </div>
          <div style={{ color: "#f4f1ea", fontSize: "14px", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {initial.approval_notes}
          </div>
        </div>
      )}

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

      {/* Recurrence */}
      <div>
        <label style={labelStyle}>Recurrence</label>
        <select
          value={recurrenceKind}
          onChange={(e) => setRecurrenceKind(e.target.value as typeof recurrenceKind)}
          style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
        >
          {RECURRENCE_KINDS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {needsBydayPicker ? (
        <div>
          <label style={labelStyle}>Day of week</label>
          <select
            value={recurrenceByday ?? ""}
            onChange={(e) => setRecurrenceByday(e.target.value === "" ? null : parseInt(e.target.value, 10))}
            style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
          >
            <option value="">Use start day</option>
            {DOW_OPTIONS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div />
      )}
      {recurrenceKind !== "none" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Recurrence ends (optional)</label>
          <input
            type="date"
            value={recurrenceUntil}
            onChange={(e) => setRecurrenceUntil(e.target.value)}
            style={inputStyle}
          />
        </div>
      )}

      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Cost (optional)</label>
        <input
          value={cost}
          onChange={(e) => setCost(e.target.value)}
          placeholder='e.g. "$15 per person" or "Free will offering" — leave blank for free'
          style={inputStyle}
        />
      </div>

      <div>
        <label style={labelStyle}>External registration URL (optional)</label>
        <input
          value={registrationUrl}
          onChange={(e) => setRegistrationUrl(e.target.value)}
          placeholder="https://… (e.g. Eventbrite, conference site)"
          style={inputStyle}
        />
        <p style={{ marginTop: "6px", color: "#9aa3b8", fontSize: "12px" }}>
          When set, the event page shows a Register button to this URL instead of the in-app signup form. Volunteer signups still work.
        </p>
        {registrationUrl.trim() && !acceptsRsvps && (
          <p
            style={{
              marginTop: "8px",
              padding: "8px 10px",
              background: "rgba(231,184,78,.1)",
              border: "1px solid rgba(231,184,78,.32)",
              borderRadius: "8px",
              color: "#e7b84e",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            Heads up: &ldquo;Accept RSVPs&rdquo; is off, so this Register button won&apos;t show on the public page.
          </p>
        )}
      </div>
      <div>
        <label style={labelStyle}>Register button label (optional)</label>
        <input
          value={registrationLabel}
          onChange={(e) => setRegistrationLabel(e.target.value)}
          placeholder='Defaults to "Register"'
          style={inputStyle}
        />
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: "10px", color: "#cdd3e0", fontSize: "13.5px" }}>
        <input
          type="checkbox"
          checked={acceptsRsvps}
          onChange={(e) => setAcceptsRsvps(e.target.checked)}
          style={{ width: "18px", height: "18px", accentColor: "#e7b84e" }}
        />
        Accept RSVPs / signups (uncheck for info-only events)
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
          checked={allowVolunteers}
          onChange={(e) => setAllowVolunteers(e.target.checked)}
          style={{ width: "18px", height: "18px", accentColor: "#e7b84e" }}
        />
        Allow volunteer signups
      </label>

      {error && (
        <div style={{ gridColumn: "1 / -1", color: "#ff8a8a", fontSize: "13px", fontWeight: 700 }}>{error}</div>
      )}

      {/* Action bar */}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
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

      <ConfirmDialog
        open={confirmingDelete}
        title="Delete this event?"
        body="Signups will be removed too. This can't be undone."
        confirmLabel="Delete event"
        danger
        pending={pending}
        onCancel={() => setConfirmingDelete(false)}
        onConfirm={confirmDelete}
      />
    </form>
  );
}
