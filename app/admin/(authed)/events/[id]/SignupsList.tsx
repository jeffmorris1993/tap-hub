import { fmtDateTime } from "../../../../../lib/format";
import type { EventSignupRow } from "../../../../../lib/supabase/admin-queries";

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

function Section({
  title,
  rows,
  emptyLabel,
}: {
  title: string;
  rows: EventSignupRow[];
  emptyLabel: string;
}) {
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
                  <div style={{ fontWeight: 800, fontSize: "13.5px", color: "#f4f1ea" }}>{s.name}</div>
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

export function SignupsList({ signups }: { signups: EventSignupRow[] }) {
  const attendees = signups.filter((s) => s.role === "attendee");
  const volunteers = signups.filter((s) => s.role === "volunteer");
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
        <span style={{ color: "#9aa3b8", fontSize: "12px", fontWeight: 700 }}>
          {signups.length} total
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
        <Section title="Attendees" rows={attendees} emptyLabel="No attendees yet." />
        <Section title="Volunteers" rows={volunteers} emptyLabel="No volunteers yet." />
      </div>
    </section>
  );
}
