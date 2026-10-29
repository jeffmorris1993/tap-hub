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
import type { RecurrenceKind } from "../../../../lib/events-occurrence";
import { ConfirmDialog } from "../ConfirmDialog";
import { SignupQuestionsEditor } from "./SignupQuestionsEditor";
import { parseSignupQuestions, type SignupQuestions } from "../../../../lib/event-signup-forms";

const CATEGORIES = ["Youth", "Sisterhood", "Brotherhood", "Marriage", "General"] as const;
const RECURRENCE_KINDS = [
  { value: "none", label: "Doesn't repeat" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly (same date)" },
  { value: "monthly_weekday", label: "Monthly (same weekday, e.g. 2nd Friday — from start date)" },
] as const;
type FormRecurrenceKind = (typeof RECURRENCE_KINDS)[number]["value"];
const DOW_CHIPS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const INTERVAL_UNITS: Record<Exclude<FormRecurrenceKind, "none">, string> = {
  daily: "days",
  weekly: "weeks",
  monthly: "months",
  monthly_weekday: "months",
};
type RecurrenceEndsMode = "never" | "until" | "count";

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
  signup_mode?: "attend" | "participate";
  allow_volunteers?: boolean;
  registration_url?: string | null;
  registration_label?: string | null;
  published?: boolean;
  approval_status?: ApprovalStatus;
  approval_notes?: string | null;
  submitted_by?: string | null;
  reviewed_by?: string | null;
  recurrence_kind?: RecurrenceKind;
  recurrence_byday?: number | null;
  recurrence_interval?: number | null;
  recurrence_bydays?: number[] | null;
  recurrence_count?: number | null;
  recurrence_until?: string | null;
  all_day?: boolean | null;
  signup_questions?: unknown;
};

export function EventForm({
  initial,
  canApprove,
  allowedCategories,
}: {
  initial?: Initial;
  canApprove: boolean;
  /** Leads only see their own ministries here; omitted = all categories. */
  allowedCategories?: string[];
}) {
  const categoryOptions = (allowedCategories?.length
    ? CATEGORIES.filter((c) => allowedCategories.includes(c))
    : CATEGORIES) as readonly (typeof CATEGORIES)[number][];
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
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>(
    initial?.category ?? categoryOptions[0] ?? "General",
  );
  const [startsAt, setStartsAt] = useState(toLocalInputValue(initial?.starts_at ?? null));
  const [endsAt, setEndsAt] = useState(toLocalInputValue(initial?.ends_at ?? null));
  const [location, setLocation] = useState(initial?.location ?? "");
  const [acceptsRsvps, setAcceptsRsvps] = useState(initial?.accepts_rsvps ?? true);
  const [signupMode, setSignupMode] = useState<"attend" | "participate">(
    initial?.signup_mode ?? "attend",
  );
  const [allowVolunteers, setAllowVolunteers] = useState(initial?.allow_volunteers ?? true);
  const [cost, setCost] = useState(initial?.cost ?? "");
  const [registrationUrl, setRegistrationUrl] = useState(initial?.registration_url ?? "");
  const [registrationLabel, setRegistrationLabel] = useState(initial?.registration_label ?? "");
  // Legacy kinds normalize into the v2 shape on load: biweekly → weekly every
  // 2 weeks, weekdays → weekly Mon–Fri.
  const initKind: RecurrenceKind = initial?.recurrence_kind ?? "none";
  const [recurrenceKind, setRecurrenceKind] = useState<FormRecurrenceKind>(
    initKind === "biweekly" || initKind === "weekdays" ? "weekly" : (initKind as FormRecurrenceKind),
  );
  const [recurrenceInterval, setRecurrenceInterval] = useState<number>(
    initKind === "biweekly" ? Math.max(2, initial?.recurrence_interval ?? 1) : initial?.recurrence_interval ?? 1,
  );
  const [recurrenceBydays, setRecurrenceBydays] = useState<number[]>(() => {
    if (initial?.recurrence_bydays?.length) return [...new Set(initial.recurrence_bydays)].sort((a, b) => a - b);
    if (initKind === "weekdays") return [1, 2, 3, 4, 5];
    if (initial?.recurrence_byday != null) return [initial.recurrence_byday];
    return [];
  });
  const [recurrenceUntil, setRecurrenceUntil] = useState<string>(initial?.recurrence_until ?? "");
  const [recurrenceCount, setRecurrenceCount] = useState<number>(initial?.recurrence_count ?? 10);
  const [endsMode, setEndsMode] = useState<RecurrenceEndsMode>(
    initial?.recurrence_until ? "until" : initial?.recurrence_count ? "count" : "never",
  );
  const [allDay, setAllDay] = useState<boolean>(initial?.all_day ?? false);
  const [signupQuestions, setSignupQuestions] = useState<SignupQuestions>(() =>
    parseSignupQuestions(initial?.signup_questions),
  );

  const status = (initial?.approval_status ?? "draft") as ApprovalStatus;
  const statusStyle = STATUS_STYLES[status];
  const isExisting = !!initial?.id;
  const canSubmit = !isExisting || status === "draft" || status === "rejected";
  // While awaiting approval, only the approver may edit — the server enforces
  // the same rule in saveEvent.
  const locked = isExisting && status === "pending" && !canApprove;

  // The weekday of the current start date — the default chip for weekly series.
  function startDayOfWeek(): number {
    const probe = startsAt ? new Date(allDay ? `${startsAt.slice(0, 10)}T12:00` : startsAt) : new Date();
    return isNaN(probe.getTime()) ? new Date().getDay() : probe.getDay();
  }

  function buildPayload(): EventFormInput {
    const bydays =
      recurrenceKind === "weekly"
        ? recurrenceBydays.length
          ? recurrenceBydays
          : [startDayOfWeek()]
        : null;
    return {
      id: initial?.id,
      slug,
      title,
      description_long: description,
      category,
      // All-day events store midnight → end-of-day Detroit wall times so
      // range display and "still live until it's over" logic stay correct.
      starts_at_local: allDay ? (startsAt ? `${startsAt.slice(0, 10)}T00:00` : "") : startsAt,
      ends_at_local: allDay ? (endsAt ? `${endsAt.slice(0, 10)}T23:59` : "") : endsAt,
      location,
      accepts_rsvps: acceptsRsvps,
      signup_mode: signupMode,
      allow_volunteers: allowVolunteers,
      registration_url: registrationUrl.trim() || null,
      registration_label: registrationLabel.trim() || null,
      cost: cost.trim() || null,
      recurrence_kind: recurrenceKind,
      recurrence_interval:
        recurrenceKind === "none" ? 1 : Math.min(12, Math.max(1, Math.round(recurrenceInterval) || 1)),
      recurrence_bydays: bydays,
      recurrence_until: recurrenceKind !== "none" && endsMode === "until" ? recurrenceUntil || null : null,
      recurrence_count:
        recurrenceKind !== "none" && endsMode === "count"
          ? Math.min(500, Math.max(1, Math.round(recurrenceCount) || 1))
          : null,
      all_day: allDay,
      signup_questions: signupQuestions,
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
        router.push(`/portal/events/${r.id}?flash=event-saved`);
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
      router.push("/portal/events?flash=event-submitted");
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
      router.push("/portal/events?flash=event-approved");
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
      router.push("/portal/events?flash=event-rejected");
    });
  }

  function onDelete() {
    if (!initial?.id) return;
    setConfirmingDelete(true);
  }

  function confirmDelete() {
    if (!initial?.id) return;
    startTransition(async () => {
      // deleteEvent server-redirects to /portal/events — append the flash
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

  const needsBydayPicker = recurrenceKind === "weekly";

  function toggleByday(dow: number) {
    setRecurrenceBydays((prev) => {
      if (prev.includes(dow)) {
        const next = prev.filter((d) => d !== dow);
        return next.length ? next : prev; // at least one day stays selected
      }
      return [...prev, dow].sort((a, b) => a - b);
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
              Live on /events
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
          <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#ff8a8a", marginBottom: "6px" }}>
            Notes from {initial.reviewed_by ?? "the approver"}
          </div>
          <div style={{ color: "#f4f1ea", fontSize: "14px", lineHeight: 1.55, whiteSpace: "pre-wrap" }}>
            {initial.approval_notes}
          </div>
        </div>
      )}

      {/* display:contents keeps the grid layout while `disabled` propagates to
          every field when the event is locked for review. */}
      <fieldset disabled={locked} style={{ display: "contents", border: "none", margin: 0, padding: 0, minWidth: 0 }}>
      <div style={{ gridColumn: "1 / -1" }}>
        <label style={labelStyle}>Title</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} style={inputStyle} required />
      </div>

      <div>
        <label style={labelStyle}>Slug (URL, optional)</label>
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
          {categoryOptions.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
      </div>

      <label
        style={{
          gridColumn: "1 / -1",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          color: "#cdd3e0",
          fontSize: "13.5px",
        }}
      >
        <input
          type="checkbox"
          checked={allDay}
          onChange={(e) => setAllDay(e.target.checked)}
          style={{ width: "18px", height: "18px", accentColor: "#e7b84e" }}
        />
        All-day (no start/end time — e.g. a multi-week drive or campaign)
      </label>
      <div>
        <label style={labelStyle}>{allDay ? "Start date" : "Starts at"}</label>
        <input
          type={allDay ? "date" : "datetime-local"}
          value={allDay ? startsAt.slice(0, 10) : startsAt}
          onChange={(e) => setStartsAt(e.target.value)}
          style={inputStyle}
          required
        />
      </div>
      <div>
        <label style={labelStyle}>{allDay ? "End date (optional)" : "Ends at (optional)"}</label>
        <input
          type={allDay ? "date" : "datetime-local"}
          value={allDay ? endsAt.slice(0, 10) : endsAt}
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
        <label style={labelStyle}>Repeats</label>
        <select
          value={recurrenceKind}
          onChange={(e) => {
            const kind = e.target.value as FormRecurrenceKind;
            setRecurrenceKind(kind);
            if (kind === "weekly" && recurrenceBydays.length === 0) {
              setRecurrenceBydays([startDayOfWeek()]);
            }
          }}
          style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
        >
          {RECURRENCE_KINDS.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
      </div>
      {recurrenceKind !== "none" ? (
        <div>
          <label style={labelStyle}>Repeat every</label>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <input
              type="number"
              min={1}
              max={12}
              value={recurrenceInterval}
              onChange={(e) => setRecurrenceInterval(parseInt(e.target.value, 10) || 1)}
              style={{ ...inputStyle, width: "90px" }}
            />
            <span style={{ color: "#cdd3e0", fontSize: "13.5px" }}>
              {recurrenceInterval === 1
                ? INTERVAL_UNITS[recurrenceKind].replace(/s$/, "")
                : INTERVAL_UNITS[recurrenceKind]}
            </span>
          </div>
        </div>
      ) : (
        <div />
      )}
      {needsBydayPicker && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>On days</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {DOW_CHIPS.map((name, dow) => {
              const on = recurrenceBydays.includes(dow);
              return (
                <button
                  key={name}
                  type="button"
                  onClick={() => toggleByday(dow)}
                  aria-pressed={on}
                  style={{
                    background: on ? "#e7b84e" : "#1a2438",
                    color: on ? "#0b101c" : "#cdd3e0",
                    border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
                    fontWeight: 800,
                    fontSize: "12px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "9px 13px",
                    borderRadius: "9px",
                    cursor: "pointer",
                  }}
                >
                  {name}
                </button>
              );
            })}
          </div>
        </div>
      )}
      {recurrenceKind !== "none" && (
        <div style={{ gridColumn: "1 / -1" }}>
          <label style={labelStyle}>Ends</label>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
            {(
              [
                { value: "never", label: "Never" },
                { value: "until", label: "On a date" },
                { value: "count", label: "After # times" },
              ] as const
            ).map((m) => {
              const on = endsMode === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setEndsMode(m.value)}
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
                  {m.label}
                </button>
              );
            })}
            {endsMode === "until" && (
              <input
                type="date"
                value={recurrenceUntil}
                onChange={(e) => setRecurrenceUntil(e.target.value)}
                style={{ ...inputStyle, width: "190px" }}
              />
            )}
            {endsMode === "count" && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="number"
                  min={1}
                  max={500}
                  value={recurrenceCount}
                  onChange={(e) => setRecurrenceCount(parseInt(e.target.value, 10) || 1)}
                  style={{ ...inputStyle, width: "90px" }}
                />
                <span style={{ color: "#cdd3e0", fontSize: "13.5px" }}>occurrences</span>
              </span>
            )}
          </div>
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
          When set, the event page shows a Register button to this URL. Works alongside volunteer signups. (When set, the in-app attendee form is hidden — the URL replaces it.)
        </p>
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
      {acceptsRsvps && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <span style={{ color: "#9aa3b8", fontSize: "12px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase" }}>
            Signing up means —
          </span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {(
              [
                ["attend", "Attending (RSVP + “attending for sure?”)"],
                ["participate", "Participating (gifting, contributing — no attendance question)"],
              ] as const
            ).map(([mode, label]) => {
              const on = signupMode === mode;
              return (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setSignupMode(mode)}
                  style={{
                    padding: "10px 13px",
                    borderRadius: "10px",
                    border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.15)"}`,
                    background: on ? "rgba(231,184,78,.14)" : "#0b101c",
                    color: on ? "#e7b84e" : "#cdd3e0",
                    fontSize: "13px",
                    fontWeight: 700,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      )}
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

      <div style={{ gridColumn: "1 / -1" }}>
        <SignupQuestionsEditor
          value={signupQuestions}
          onChange={setSignupQuestions}
          showAttendee={acceptsRsvps && !registrationUrl.trim()}
          showVolunteer={allowVolunteers}
        />
      </div>
      </fieldset>

      {error && (
        <div style={{ gridColumn: "1 / -1", color: "#ff8a8a", fontSize: "13px", fontWeight: 700 }}>{error}</div>
      )}

      {/* Action bar */}
      <div style={{ gridColumn: "1 / -1", display: "flex", gap: "10px", marginTop: "8px", flexWrap: "wrap" }}>
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
