import Link from "next/link";
import { listAllEvents, type AdminEventRow } from "../../../../lib/supabase/admin-queries";
import { recurrenceLabel, type RecurringEventFields } from "../../../../lib/events-occurrence";
import { isSeriesOver } from "../../../../lib/event-calendar";
import { detroitDateIso } from "../../../../lib/tz";
import { currentUserCanApprove } from "./actions";
import { requireLead, ministryScope } from "../../../../lib/portal-auth";

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

const smallPill: React.CSSProperties = {
  fontSize: "10px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "3px 8px",
  borderRadius: "5px",
};

function EventCard({ e, past }: { e: AdminEventRow; past?: boolean }) {
  const pill = STATUS_PILL[e.approval_status];
  return (
    <Link
      href={`/portal/events/${e.id}`}
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
        opacity: past ? 0.6 : 1,
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
          <span style={{ ...smallPill, background: "rgba(231,184,78,.15)", color: "#e7b84e" }}>
            {e.category}
          </span>
          <span style={{ ...smallPill, background: pill.bg, color: pill.color }}>
            {pill.label}
          </span>
          {past && (
            <span style={{ ...smallPill, background: "rgba(154,163,184,.15)", color: "#9aa3b8" }}>
              Past
            </span>
          )}
          {e.recurrence_kind !== "none" && (
            <span style={{ ...smallPill, background: "rgba(78,141,231,.16)", color: "#9bbcf2" }}>
              {recurrenceLabel(e.recurrence_kind, e.starts_at) || e.recurrence_kind}
            </span>
          )}
          {e.approval_status === "approved" && !e.published && (
            <span style={{ ...smallPill, background: "rgba(154,163,184,.15)", color: "#9aa3b8" }}>
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
}

const toggleLinkStyle: React.CSSProperties = {
  display: "inline-block",
  background: "#1a2438",
  color: "#9aa3b8",
  fontWeight: 800,
  fontSize: "12.5px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  padding: "12px 18px",
  borderRadius: "10px",
  textDecoration: "none",
  border: "1px solid rgba(244,241,234,.12)",
};

export default async function AdminEvents({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>;
}) {
  const pu = await requireLead();
  const scope = ministryScope(pu);
  const [events, canApprove, params] = await Promise.all([
    listAllEvents(scope),
    currentUserCanApprove(),
    searchParams,
  ]);
  const showArchived = params.archived === "1";
  const pendingCount = events.filter((e) => e.approval_status === "pending").length;

  const todayIso = detroitDateIso();
  const archived = events.filter((e) => isSeriesOver(e as RecurringEventFields, todayIso));
  const current = events.filter((e) => !isSeriesOver(e as RecurringEventFields, todayIso));

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
              href="/portal/events/pending"
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
            href="/portal/events/new"
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

      {current.length === 0 && archived.length === 0 ? (
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
          {current.map((e) => (
            <EventCard key={e.id} e={e} />
          ))}
          {current.length === 0 && (
            <div style={{ color: "#9aa3b8", fontSize: "13.5px", padding: "8px 2px" }}>
              No current events. Create one above{archived.length > 0 ? " or browse the archive below" : ""}.
            </div>
          )}
        </div>
      )}

      {archived.length > 0 && !showArchived && (
        <div style={{ marginTop: "18px" }}>
          <Link href="/portal/events?archived=1" style={toggleLinkStyle}>
            Show archived ({archived.length})
          </Link>
        </div>
      )}

      {archived.length > 0 && showArchived && (
        <>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              margin: "28px 0 12px",
              gap: "12px",
            }}
          >
            <span
              style={{
                fontSize: "11.5px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6a738b",
              }}
            >
              Archived
            </span>
            <Link href="/portal/events" style={{ ...toggleLinkStyle, padding: "8px 14px" }}>
              Hide archived
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {archived.map((e) => (
              <EventCard key={e.id} e={e} past />
            ))}
          </div>
        </>
      )}

      {!canApprove && (
        <p style={{ marginTop: "26px", color: "#6a738b", fontSize: "12.5px" }}>
          Submissions are reviewed by the Bishop and Assistant Pastor before they appear on /events.
        </p>
      )}
    </div>
  );
}
