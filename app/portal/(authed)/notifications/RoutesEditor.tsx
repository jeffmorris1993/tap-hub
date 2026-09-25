"use client";

import { useState, useTransition } from "react";
import { updateNotificationRoute } from "./actions";
import type { NotificationKind } from "../../../../lib/notification-routes";
import type { PortalRole } from "../../../../lib/portal-auth";

export type StaffProfile = {
  id: string;
  email: string;
  full_name: string | null;
  role: PortalRole;
};

const ROLE_BADGE: Record<PortalRole, { bg: string; color: string; label: string }> = {
  member: { bg: "rgba(154,163,184,.16)", color: "#cdd3e0", label: "Member" },
  lead: { bg: "rgba(231,184,78,.16)", color: "#e7b84e", label: "Lead" },
  pastoral: { bg: "rgba(78,184,107,.16)", color: "#7ed996", label: "Pastoral" },
};

type SectionProps = {
  kind: NotificationKind;
  title: string;
  description: string;
  staff: StaffProfile[];
  initial: string[];
};

function Section({ kind, title, description, staff, initial }: SectionProps) {
  const staffEmails = staff.map((s) => s.email);
  const [selected, setSelected] = useState<string[]>(
    initial.filter((e) => staffEmails.includes(e)),
  );
  const [extras, setExtras] = useState(
    initial.filter((e) => !staffEmails.includes(e)).join(", "),
  );
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const customized = selected.length > 0 || extras.trim() !== "";

  function save() {
    setError(null);
    setSaved(false);
    startTransition(async () => {
      const recipients = [
        ...selected,
        ...extras.split(",").map((e) => e.trim()).filter(Boolean),
      ];
      const r = await updateNotificationRoute(kind, recipients);
      if (r.ok) {
        setSaved(true);
        setSelected(r.recipients.filter((e) => staffEmails.includes(e)));
        setExtras(r.recipients.filter((e) => !staffEmails.includes(e)).join(", "));
      } else {
        setError(r.error);
      }
    });
  }

  return (
    <div
      style={{
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "15px",
        padding: "20px 22px",
      }}
    >
      <h2
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "19px",
          color: "#f4f1ea",
          margin: "0 0 6px",
        }}
      >
        {title}
      </h2>
      <p style={{ color: "#9aa3b8", fontSize: "13.5px", fontWeight: 600, margin: "0 0 16px" }}>
        {description}
      </p>

      <div
        style={{
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#9aa3b8",
          marginBottom: "8px",
        }}
      >
        Staff recipients
      </div>
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {staff.map((s) => {
          const on = selected.includes(s.email);
          const badge = ROLE_BADGE[s.role];
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                setSaved(false);
                setSelected((cur) =>
                  on ? cur.filter((e) => e !== s.email) : [...cur, s.email],
                );
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                fontWeight: 800,
                fontSize: "12.5px",
                padding: "10px 14px",
                borderRadius: "10px",
                cursor: "pointer",
                background: on ? "rgba(231,184,78,.16)" : "#1a2438",
                color: on ? "#e7b84e" : "#cdd3e0",
                border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
              }}
            >
              <span>{s.full_name?.trim() || s.email}</span>
              <span
                style={{
                  fontSize: "9.5px",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "3px 7px",
                  borderRadius: "5px",
                  background: badge.bg,
                  color: badge.color,
                }}
              >
                {badge.label}
              </span>
            </button>
          );
        })}
        {staff.length === 0 && (
          <span style={{ color: "#6a738b", fontSize: "13px", fontWeight: 600 }}>
            No lead or pastoral accounts yet.
          </span>
        )}
      </div>

      <div
        style={{
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          color: "#9aa3b8",
          marginBottom: "8px",
        }}
      >
        Additional emails
      </div>
      <input
        type="text"
        value={extras}
        onChange={(e) => {
          setSaved(false);
          setExtras(e.target.value);
        }}
        placeholder="Comma-separated, e.g. deacon@nehtemple.org, care@nehtemple.org"
        style={{
          width: "100%",
          boxSizing: "border-box",
          background: "#0b101c",
          border: "1px solid rgba(244,241,234,.12)",
          borderRadius: "10px",
          padding: "12px 14px",
          color: "#f4f1ea",
          fontSize: "13.5px",
          fontWeight: 600,
          marginBottom: "14px",
        }}
      />

      <div
        style={{
          background: customized ? "rgba(231,184,78,.08)" : "rgba(78,184,107,.08)",
          border: `1px solid ${customized ? "rgba(231,184,78,.28)" : "rgba(78,184,107,.25)"}`,
          borderRadius: "10px",
          padding: "10px 13px",
          fontSize: "12.5px",
          fontWeight: 700,
          color: customized ? "#e7b84e" : "#7ed996",
          marginBottom: "14px",
        }}
      >
        {customized
          ? "Custom list — only the people above will be emailed."
          : "Default — everyone with the pastoral role will be emailed."}
      </div>

      {error && (
        <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginBottom: "12px" }}>
          {error}
        </div>
      )}
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <button
          type="button"
          disabled={pending}
          onClick={save}
          style={{
            background: "#e7b84e",
            color: "#0b101c",
            fontWeight: 800,
            fontSize: "12.5px",
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            padding: "12px 22px",
            borderRadius: "10px",
            border: "none",
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {saved && (
          <span style={{ color: "#7ed996", fontSize: "13px", fontWeight: 800 }}>Saved ✓</span>
        )}
      </div>
    </div>
  );
}

export function RoutesEditor({
  staff,
  prayer,
  feedback,
}: {
  staff: StaffProfile[];
  prayer: string[];
  feedback: string[];
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      <Section
        kind="prayer"
        title="Prayer requests"
        description="Confidential prayer requests submitted from the feedback page."
        staff={staff}
        initial={prayer}
      />
      <Section
        kind="feedback"
        title="Feedback"
        description="Ratings and comments submitted from the feedback page."
        staff={staff}
        initial={feedback}
      />
    </div>
  );
}
