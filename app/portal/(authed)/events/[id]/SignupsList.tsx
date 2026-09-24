import { fmtDateTime } from "../../../../../lib/format";
import type { EventSignupRow } from "../../../../../lib/supabase/admin-queries";
import { parseStoredResponses } from "../../../../../lib/event-signup-forms";

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function looksLikePhone(s: string): boolean {
  const digits = s.replace(/\D/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

function contactHref(contact: string): string | null {
  const v = contact.trim();
  if (looksLikeEmail(v)) return `mailto:${v}`;
  if (looksLikePhone(v)) return `tel:${v.replace(/[^\d+]/g, "")}`;
  return null;
}

function attendancePill(attendance: "yes" | "maybe") {
  const sure = attendance === "yes";
  return (
    <span
      style={{
        background: sure ? "rgba(78,184,107,.16)" : "rgba(231,184,78,.16)",
        color: sure ? "#7ed996" : "#e7b84e",
        fontSize: "10px",
        fontWeight: 800,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
        padding: "2px 7px",
        borderRadius: "5px",
        whiteSpace: "nowrap",
      }}
    >
      {sure ? "For sure" : "Not sure"}
    </span>
  );
}

function Section({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: EventSignupRow[];
  emptyLabel: string;
}) {
  // "3 for sure · 1 not sure" next to the count, once any attendance data exists.
  const sure = rows.filter((s) => s.attendance === "yes").length;
  const unsure = rows.filter((s) => s.attendance === "maybe").length;
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <h3
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "16px",
            color: "#f4f1ea",
          }}
        >
          {title}
        </h3>
        <span style={{ color: "#6a738b", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em" }}>
          {sure + unsure > 0 ? `${sure} for sure · ${unsure} not sure · ` : ""}
          {rows.length}
        </span>
      </div>
      {rows.length === 0 ? (
        <div
          style={{
            color: "#6a738b",
            fontSize: "13px",
            fontWeight: 600,
            background: "#1a2438",
            border: "1px dashed rgba(244,241,234,.08)",
            borderRadius: "11px",
            padding: "18px",
            textAlign: "center",
          }}
        >
          {emptyLabel}
        </div>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {rows.map((s) => {
            const href = contactHref(s.contact);
            const responses = parseStoredResponses(s.responses);
            return (
              <li
                key={s.id}
                style={{
                  background: "#1a2438",
                  border: "1px solid rgba(244,241,234,.06)",
                  borderRadius: "11px",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "12px",
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 800, fontSize: "13.5px", color: "#f4f1ea" }}>{s.name}</span>
                    {s.attendance && attendancePill(s.attendance)}
                  </div>
                  <div style={{ fontSize: "12.5px", color: "#9aa3b8", fontWeight: 600, marginTop: "2px" }}>
                    {href ? (
                      <a href={href} style={{ color: "#cdd3e0", textDecoration: "none" }}>
                        {s.contact}
                      </a>
                    ) : (
                      s.contact || <span style={{ color: "#6a738b" }}>(no contact)</span>
                    )}
                  </div>
                  {s.notes && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 10px",
                        background: "#121a2e",
                        border: "1px solid rgba(244,241,234,.07)",
                        borderRadius: "8px",
                        fontSize: "12.5px",
                        color: "#cdd3e0",
                        lineHeight: 1.4,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {s.notes}
                    </div>
                  )}
                  {responses.length > 0 && (
                    <div
                      style={{
                        marginTop: "8px",
                        padding: "8px 10px",
                        background: "#121a2e",
                        border: "1px solid rgba(244,241,234,.07)",
                        borderRadius: "8px",
                        display: "flex",
                        flexDirection: "column",
                        gap: "7px",
                      }}
                    >
                      {responses.map((r) => (
                        <div key={r.id}>
                          <div
                            style={{
                              fontSize: "10px",
                              fontWeight: 800,
                              letterSpacing: "0.07em",
                              textTransform: "uppercase",
                              color: "#6a738b",
                            }}
                          >
                            {r.label}
                          </div>
                          <div style={{ fontSize: "12.5px", color: "#cdd3e0", lineHeight: 1.4, whiteSpace: "pre-wrap" }}>
                            {Array.isArray(r.value) ? r.value.join(", ") : r.value}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={{ color: "#6a738b", fontSize: "11.5px", whiteSpace: "nowrap", alignSelf: "flex-start" }}>
                  {fmtDateTime(s.created_at)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function fmtOccurrenceDate(dateIso: string): string {
  // Noon UTC keeps the calendar date stable regardless of server timezone.
  return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function RoleColumns({
  rows,
  acceptsRsvps,
  allowVolunteers,
}: {
  rows: EventSignupRow[];
  acceptsRsvps: boolean;
  allowVolunteers: boolean;
}) {
  const attendees = rows.filter((s) => s.role === "attendee");
  const volunteers = rows.filter((s) => s.role === "volunteer");
  // Show only sections that match what the event actually collects.
  // (Old signups from before a flag flipped still show under whichever
  // section is still enabled — if both are off the parent doesn't even
  // render this list.)
  const showAttendees = acceptsRsvps || attendees.length > 0;
  const showVolunteers = allowVolunteers || volunteers.length > 0;
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
      {showAttendees && <Section title="Attendees" rows={attendees} emptyLabel="No attendees yet." />}
      {showVolunteers && <Section title="Volunteers" rows={volunteers} emptyLabel="No volunteers yet." />}
    </div>
  );
}

export function SignupsList({
  signups,
  acceptsRsvps,
  allowVolunteers,
  isRecurring = false,
  eventId,
}: {
  signups: EventSignupRow[];
  acceptsRsvps: boolean;
  allowVolunteers: boolean;
  isRecurring?: boolean;
  /** When set (and there are signups), the header shows an Export CSV link. */
  eventId?: string;
}) {
  // Recurring events group signups per occurrence date; one-off events keep
  // a single flat block (their signups all carry a null occurrence_date).
  const dates = isRecurring
    ? [...new Set(signups.filter((s) => s.occurrence_date).map((s) => s.occurrence_date as string))].sort()
    : [];
  const undated = signups.filter((s) => !s.occurrence_date);

  return (
    <section
      style={{
        marginTop: "36px",
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "18px",
        padding: "22px 24px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          marginBottom: "18px",
        }}
      >
        <h2
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "22px",
            color: "#f4f1ea",
          }}
        >
          Signups
        </h2>
        <span style={{ display: "flex", alignItems: "baseline", gap: "14px" }}>
          {eventId && signups.length > 0 && (
            <a
              href={`/portal/events/${eventId}/export`}
              style={{
                color: "#e7b84e",
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                textDecoration: "none",
                border: "1px solid rgba(231,184,78,.35)",
                borderRadius: "8px",
                padding: "6px 12px",
              }}
            >
              Export CSV
            </a>
          )}
          <span style={{ color: "#9aa3b8", fontSize: "12px", fontWeight: 700 }}>
            {signups.length} total
          </span>
        </span>
      </div>

      {!isRecurring ? (
        <RoleColumns rows={signups} acceptsRsvps={acceptsRsvps} allowVolunteers={allowVolunteers} />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "26px" }}>
          {dates.length === 0 && undated.length === 0 && (
            <RoleColumns rows={[]} acceptsRsvps={acceptsRsvps} allowVolunteers={allowVolunteers} />
          )}
          {dates.map((d) => {
            const rows = signups.filter((s) => s.occurrence_date === d);
            return (
              <div key={d}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: "10px",
                    marginBottom: "12px",
                    paddingBottom: "8px",
                    borderBottom: "1px solid rgba(231,184,78,.2)",
                  }}
                >
                  <span style={{ color: "#e7b84e", fontWeight: 800, fontSize: "13.5px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    {fmtOccurrenceDate(d)}
                  </span>
                  <span style={{ color: "#6a738b", fontSize: "12px", fontWeight: 700 }}>
                    {rows.length} signed up
                  </span>
                </div>
                <RoleColumns rows={rows} acceptsRsvps={acceptsRsvps} allowVolunteers={allowVolunteers} />
              </div>
            );
          })}
          {undated.length > 0 && (
            <div>
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: "10px",
                  marginBottom: "12px",
                  paddingBottom: "8px",
                  borderBottom: "1px solid rgba(244,241,234,.12)",
                }}
              >
                <span style={{ color: "#9aa3b8", fontWeight: 800, fontSize: "13.5px", letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  No specific date
                </span>
                <span style={{ color: "#6a738b", fontSize: "12px", fontWeight: 700 }}>
                  {undated.length} · from before per-date signups
                </span>
              </div>
              <RoleColumns rows={undated} acceptsRsvps={acceptsRsvps} allowVolunteers={allowVolunteers} />
            </div>
          )}
        </div>
      )}
    </section>
  );
}
