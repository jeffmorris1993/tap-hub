import Link from "next/link";
import { listAllEvents, type AdminEventRow } from "../../../../lib/supabase/admin-queries";
import { currentUserCanApprove } from "./actions";

export const dynamic = "force-dynamic";

const STATUS_PILL: Record<
  AdminEventRow["approval_status"],
  { bg: string; color: string; label: string }
> = {
  draft: { bg: "rgba(154,163,184,.15)", color: "#cdd3e0", label: "Draft" },
  pending: { bg: "rgba(231,184,78,.18)", color: "#e7b84e", label: "Awaiting approval" },
  approved: { bg: "rgba(78,184,107,.16)", color: "#7ed996", label: "Approved" },
  rejected: { bg: "rgba(181,50,65,.16)", color: "#ff8a8a", label: "Revisions requested" },
};

import { fmtDateTime as fmt } from "../../../../lib/format";

export default async function AdminEvents() {
  const [events, canApprove] = await Promise.all([listAllEvents(), currentUserCanApprove()]);
  const pendingCount = events.filter((e) => e.approval_status === "pending").length;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "22px", gap: "12px", flexWrap: "wrap" }}>
        <h1
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "32px",
            lineHeight: 1,
          }}
        >
          Events
        </h1>
        <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
          {pendingCount > 0 && (
            <Link
              href="/admin/events/pending"
              style={{
                background: "#1a2438",
                color: "#e7b84e",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "12px 18px",
                borderRadius: "10px",
                textDecoration: "none",
                border: "1px solid rgba(231,184,78,.35)",
              }}
            >
              {pendingCount} pending →
            </Link>
          )}
          <Link
            href="/admin/events/new"
            style={{
              background: "#e7b84e",
              color: "#0b101c",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "12px 22px",
              borderRadius: "10px",
              textDecoration: "none",
            }}
          >
            New event
          </Link>
        </div>
      </div>

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
          No events yet. Create your first one above.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {events.map((e) => {
            const pill = STATUS_PILL[e.approval_status];
            return (
              <Link
                key={e.id}
                href={`/admin/events/${e.id}`}
                style={{
                  background: "#121a2e",
                  border: "1px solid rgba(244,241,234,.08)",
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
                    <span
                      style={{
                        background: pill.bg,
                        color: pill.color,
                        fontSize: "10px",
                        fontWeight: 800,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        padding: "3px 8px",
                        borderRadius: "5px",
                      }}
                    >
                      {pill.label}
                    </span>
                    {e.recurrence_kind !== "none" && (
                      <span
                        style={{
                          background: "rgba(78,141,231,.16)",
                          color: "#9bbcf2",
                          fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: "5px",
                        }}
                      >
                        {e.recurrence_kind}
                      </span>
                    )}
                    {e.approval_status === "approved" && !e.published && (
                      <span
                        style={{
                          background: "rgba(154,163,184,.15)",
                          color: "#9aa3b8",
                          fontSize: "10px",
                          fontWeight: 800,
                          letterSpacing: "0.08em",
                          textTransform: "uppercase",
                          padding: "3px 8px",
                          borderRadius: "5px",
                        }}
                      >
                        Unpublished
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#9aa3b8", fontSize: "12.5px", marginTop: "4px", fontWeight: 600 }}>
                    {fmt(e.starts_at)} · {e.location}
                  </div>
                </div>
                <span style={{ color: "#e7b84e", fontSize: "12px", fontWeight: 800, letterSpacing: "0.05em", textTransform: "uppercase" }}>
                  Edit →
                </span>
              </Link>
            );
          })}
        </div>
      )}
      {!canApprove && (
        <p style={{ marginTop: "26px", color: "#6a738b", fontSize: "12.5px" }}>
          Submissions are reviewed by the Bishop and Assistant Pastor before they appear on /events.
        </p>
      )}
    </div>
  );
}
