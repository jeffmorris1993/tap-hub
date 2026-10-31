"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "../../Toaster";
import { closeEventCheckin, openEventCheckin, updateEventCheckinWindow } from "./actions";

export type EventCheckinWindow = {
  serviceId: string;
  /** Detroit YYYY-MM-DD. */
  date: string;
  dateLabel: string;
  opensMinutes: number;
  closesMinutes: number;
  opensLabel: string;
  closesLabel: string;
  isOpenNow: boolean;
  checkins: number;
  walkins: number;
};

export type OccurrenceChoice = { date: string; label: string };

const section: React.CSSProperties = {
  marginTop: "36px",
  background: "#121a2e",
  border: "1px solid rgba(244,241,234,.08)",
  borderRadius: "18px",
  padding: "22px 24px",
};

const h2: React.CSSProperties = {
  fontFamily: "var(--font-anton)",
  fontWeight: 400,
  textTransform: "uppercase",
  fontSize: "21px",
  color: "#f4f1ea",
  lineHeight: 1.05,
};

const goldButton: React.CSSProperties = {
  background: "#e7b84e",
  color: "#0b101c",
  fontWeight: 800,
  fontSize: "12.5px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "12px 22px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
};

const quietButton: React.CSSProperties = {
  background: "transparent",
  border: "1px solid rgba(244,241,234,.16)",
  color: "#cdd3e0",
  fontWeight: 800,
  fontSize: "12.5px",
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  padding: "12px 18px",
  borderRadius: "10px",
  cursor: "pointer",
  textDecoration: "none",
  display: "inline-flex",
  alignItems: "center",
};

const timeInput: React.CSSProperties = {
  minHeight: "46px",
  padding: "0 12px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "10px",
  fontSize: "15px",
  color: "#f4f1ea",
  background: "#070b14",
  outline: "none",
};

function toTimeValue(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function fromTimeValue(value: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(value);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

/**
 * Arrival check-in for an event, using the same machinery as Sunday services:
 * opening it creates a one-off window, which the public /checkin page and the
 * attendance reports then handle without special-casing.
 */
export function EventCheckinCard({
  eventId,
  windows,
  occurrences,
}: {
  eventId: string;
  /** Existing windows for this event, newest occurrence first. */
  windows: EventCheckinWindow[];
  /** Upcoming dates that could be opened, from the recurrence rule. */
  occurrences: OccurrenceChoice[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [date, setDate] = useState(occurrences[0]?.date ?? "");
  const [editing, setEditing] = useState<string | null>(null);
  const [opens, setOpens] = useState("");
  const [closes, setCloses] = useState("");

  const openable = occurrences.filter((o) => !windows.some((w) => w.date === o.date));

  function run(fn: () => Promise<{ ok: boolean; error?: string }>, success: string) {
    startTransition(async () => {
      const r = await fn();
      if (r.ok) {
        toast(success, "success");
        setEditing(null);
        router.refresh();
      } else {
        toast(r.error ?? "Something went wrong.", "error");
      }
    });
  }

  return (
    <section style={section}>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "16px" }}>
        <h2 style={h2}>Arrival check-in</h2>
        <p style={{ color: "#9aa3b8", fontSize: "13.5px", fontWeight: 600, lineHeight: 1.55 }}>
          Open a check-in window and people can tap in when they arrive, the same way they do
          for Sunday service. Put the display screen on a TV or tablet by the door and they
          scan the QR code.
        </p>
      </div>

      {windows.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "18px" }}>
          {windows.map((w) => (
            <div
              key={w.serviceId}
              style={{
                background: "#0b101c",
                border: `1px solid ${w.isOpenNow ? "rgba(231,184,78,.3)" : "rgba(244,241,234,.07)"}`,
                borderRadius: "14px",
                padding: "15px 16px",
                display: "flex",
                flexDirection: "column",
                gap: "12px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  flexWrap: "wrap",
                }}
              >
                <span style={{ fontWeight: 800, fontSize: "15px", color: "#f4f1ea" }}>
                  {w.dateLabel}
                </span>
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: 800,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    padding: "4px 9px",
                    borderRadius: "6px",
                    background: w.isOpenNow ? "rgba(231,184,78,.16)" : "rgba(154,163,184,.16)",
                    color: w.isOpenNow ? "#e7b84e" : "#cdd3e0",
                  }}
                >
                  {w.isOpenNow ? "Open now" : "Scheduled"}
                </span>
                <span
                  style={{
                    marginLeft: "auto",
                    fontSize: "13px",
                    color: "#9aa3b8",
                    fontWeight: 700,
                    fontVariantNumeric: "tabular-nums",
                  }}
                >
                  {w.checkins} checked in
                  {w.walkins > 0 ? ` + ${w.walkins} walk-in${w.walkins === 1 ? "" : "s"}` : ""}
                </span>
              </div>

              {editing === w.serviceId ? (
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9aa3b8" }}>
                      Opens
                    </span>
                    <input
                      type="time"
                      value={opens}
                      onChange={(e) => setOpens(e.target.value)}
                      style={timeInput}
                    />
                  </label>
                  <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                    <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9aa3b8" }}>
                      Closes
                    </span>
                    <input
                      type="time"
                      value={closes}
                      onChange={(e) => setCloses(e.target.value)}
                      style={timeInput}
                    />
                  </label>
                  <button
                    type="button"
                    disabled={pending}
                    style={goldButton}
                    onClick={() => {
                      const o = fromTimeValue(opens);
                      const c = fromTimeValue(closes);
                      if (o === null || c === null) {
                        toast("Pick both an opening and a closing time.", "error");
                        return;
                      }
                      run(
                        () =>
                          updateEventCheckinWindow({
                            eventId,
                            serviceId: w.serviceId,
                            opensMinutes: o,
                            closesMinutes: c,
                          }),
                        "Check-in hours updated.",
                      );
                    }}
                  >
                    {pending ? "Saving…" : "Save hours"}
                  </button>
                  <button type="button" style={quietButton} onClick={() => setEditing(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center" }}>
                  <span style={{ fontSize: "13px", color: "#cdd3e0", fontWeight: 600, marginRight: "4px" }}>
                    {w.opensLabel} – {w.closesLabel}
                  </span>
                  <Link href={`/portal/display/${w.serviceId}`} style={quietButton}>
                    Display screen
                  </Link>
                  <Link href="/portal/attendance?tab=history" style={quietButton}>
                    Attendance
                  </Link>
                  <button
                    type="button"
                    style={quietButton}
                    onClick={() => {
                      setEditing(w.serviceId);
                      setOpens(toTimeValue(w.opensMinutes));
                      setCloses(toTimeValue(w.closesMinutes));
                    }}
                  >
                    Change hours
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    style={{
                      ...quietButton,
                      border: "1.5px solid rgba(181,50,65,.55)",
                      color: "#e0707d",
                    }}
                    onClick={() =>
                      run(
                        () => closeEventCheckin({ eventId, serviceId: w.serviceId }),
                        "Check-in closed. Everyone who checked in is still in the history.",
                      )
                    }
                  >
                    Close check-in
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {openable.length === 0 ? (
        <p style={{ color: "#6a738b", fontSize: "13px", fontWeight: 600 }}>
          {occurrences.length === 0
            ? "This event has no upcoming dates left, so there's nothing new to open."
            : "Every upcoming date already has a check-in window."}
        </p>
      ) : (
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "flex-end" }}>
          {openable.length > 1 && (
            <label style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <span style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#9aa3b8" }}>
                Which date
              </span>
              <select
                value={date}
                onChange={(e) => setDate(e.target.value)}
                style={{ ...timeInput, minWidth: "210px" }}
              >
                {openable.map((o) => (
                  <option key={o.date} value={o.date}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            disabled={pending}
            style={goldButton}
            onClick={() => {
              const pick = openable.length === 1 ? openable[0].date : date || openable[0].date;
              run(
                () => openEventCheckin({ eventId, occurrenceDate: pick }),
                "Check-in is open. The display screen is ready.",
              );
            }}
          >
            {pending
              ? "Opening…"
              : openable.length === 1
                ? `Open check-in for ${openable[0].label}`
                : "Open check-in"}
          </button>
        </div>
      )}
    </section>
  );
}
