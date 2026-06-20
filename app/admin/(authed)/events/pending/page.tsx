import Link from "next/link";
import { listPendingEvents } from "../../../../../lib/supabase/admin-queries";
import { currentUserCanApprove } from "../actions";

export const dynamic = "force-dynamic";

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function PendingEvents() {
  const [events, canApprove] = await Promise.all([listPendingEvents(), currentUserCanApprove()]);

  return (
    <div>
      <Link
        href="/admin/events"
        style={{ color: "#9aa3b8", fontSize: "12.5px", textDecoration: "none", fontWeight: 700 }}
      >
        ← All events
      </Link>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          margin: "10px 0 6px",
        }}
      >
        Pending approval
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "14px", marginBottom: "22px" }}>
        {canApprove
          ? "Events waiting on your review. Approve to publish, or reject with notes for the submitter."
          : "Events submitted for review. The Bishop or Assistant Pastor will approve or reject."}
      </p>

      {events.length === 0 ? (
        <div
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "14px",
            padding: "44px 22px",
            textAlign: "center",
            color: "#9aa3b8",
            fontSize: "14px",
          }}
        >
          Nothing waiting. Inbox zero.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {events.map((e) => (
            <Link
              key={e.id}
              href={`/admin/events/${e.id}`}
              style={{
                background: "#121a2e",
                border: "1px solid rgba(231,184,78,.25)",
                borderRadius: "12px",
                padding: "16px 18px",
                textDecoration: "none",
                color: "inherit",
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: "12px",
                alignItems: "center",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <div
                    style={{
                      fontFamily: "var(--font-anton)",
                      fontWeight: 400,
                      textTransform: "uppercase",
                      fontSize: "18px",
                      lineHeight: 1.04,
                    }}
                  >
                    {e.title}
                  </div>
                  <span
                    style={{
                      background: "rgba(231,184,78,.15)",
                      color: "#e7b84e",
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: "5px",
                    }}
                  >
                    {e.category}
                  </span>
                </div>
                <div style={{ color: "#9aa3b8", fontSize: "12.5px", marginTop: "4px", fontWeight: 600 }}>
                  {fmt(e.starts_at)} · {e.location}
                </div>
                {e.submitted_by && (
                  <div style={{ color: "#6a738b", fontSize: "12px", marginTop: "4px" }}>
                    Submitted by {e.submitted_by}
                    {e.submitted_at ? ` · ${fmt(e.submitted_at)}` : ""}
                  </div>
                )}
              </div>
              <span
                style={{
                  color: "#e7b84e",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                }}
              >
                Review →
              </span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
