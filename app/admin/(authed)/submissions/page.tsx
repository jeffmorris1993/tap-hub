import Link from "next/link";
import {
  listVisitors,
  listFeedback,
  listPrayers,
  listSignups,
} from "../../../../lib/supabase/admin-queries";

export const dynamic = "force-dynamic";

type Tab = "visitors" | "feedback" | "prayers" | "signups";

const TABS: { key: Tab; label: string }[] = [
  { key: "visitors", label: "I'm New" },
  { key: "prayers", label: "Prayer Requests" },
  { key: "feedback", label: "Feedback" },
  { key: "signups", label: "Event Signups" },
];

export default async function Submissions({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab: Tab = (TABS.find((t) => t.key === params.tab)?.key ?? "visitors") as Tab;

  const data = await loadTab(tab);

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          marginBottom: "20px",
        }}
      >
        Inbox
      </h1>

      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {TABS.map((t) => {
          const on = t.key === tab;
          return (
            <Link
              key={t.key}
              href={`/admin/submissions?tab=${t.key}`}
              style={{
                fontWeight: 800,
                fontSize: "12.5px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "10px 16px",
                borderRadius: "10px",
                textDecoration: "none",
                background: on ? "#e7b84e" : "#121a2e",
                color: on ? "#0b101c" : "#cdd3e0",
                border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
              }}
            >
              {t.label}
            </Link>
          );
        })}
      </div>

      {tab === "visitors" && <VisitorsTable rows={data as Awaited<ReturnType<typeof listVisitors>>} />}
      {tab === "prayers" && <PrayersTable rows={data as Awaited<ReturnType<typeof listPrayers>>} />}
      {tab === "feedback" && <FeedbackTable rows={data as Awaited<ReturnType<typeof listFeedback>>} />}
      {tab === "signups" && <SignupsTable rows={data as Awaited<ReturnType<typeof listSignups>>} />}
    </div>
  );
}

async function loadTab(tab: Tab) {
  if (tab === "visitors") return await listVisitors();
  if (tab === "prayers") return await listPrayers();
  if (tab === "feedback") return await listFeedback();
  return await listSignups();
}

import { fmtDateTime as fmtDate } from "../../../../lib/format";

const tableStyle: React.CSSProperties = {
  width: "100%",
  borderCollapse: "collapse",
  background: "#121a2e",
  border: "1px solid rgba(244,241,234,.08)",
  borderRadius: "14px",
  overflow: "hidden",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  fontSize: "10.5px",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#9aa3b8",
  padding: "13px 16px",
  borderBottom: "1px solid rgba(244,241,234,.08)",
  background: "#0e1525",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontSize: "13.5px",
  color: "#f4f1ea",
  borderBottom: "1px solid rgba(244,241,234,.06)",
  verticalAlign: "top",
};

function EmptyState({ label }: { label: string }) {
  return (
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
      No {label} yet.
    </div>
  );
}

function VisitorsTable({ rows }: { rows: Awaited<ReturnType<typeof listVisitors>> }) {
  if (rows.length === 0) return <EmptyState label="visitor submissions" />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>When</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Contact</th>
            <th style={thStyle}>First time?</th>
            <th style={thStyle}>Interests</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#9aa3b8" }}>{fmtDate(r.created_at)}</td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{r.name}</td>
              <td style={tdStyle}>
                {r.email && (
                  <div>
                    <a href={`mailto:${r.email}`} style={{ color: "#e7b84e", textDecoration: "none" }}>
                      {r.email}
                    </a>
                  </div>
                )}
                {r.phone && (
                  <div>
                    <a href={`tel:${r.phone}`} style={{ color: "#cdd3e0", textDecoration: "none" }}>
                      {r.phone}
                    </a>
                  </div>
                )}
                {!r.email && !r.phone && <span style={{ color: "#6a738b" }}>—</span>}
              </td>
              <td style={tdStyle}>
                {r.first_time === true ? (
                  <span
                    style={{
                      background: "#e7b84e",
                      color: "#6b531a",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "4px 9px",
                      borderRadius: "5px",
                    }}
                  >
                    First time
                  </span>
                ) : r.first_time === false ? (
                  <span style={{ color: "#9aa3b8", fontSize: "12.5px" }}>Returning</span>
                ) : (
                  <span style={{ color: "#6a738b" }}>—</span>
                )}
              </td>
              <td style={{ ...tdStyle, color: "#cdd3e0", fontSize: "12.5px" }}>
                {r.interests.length ? r.interests.join(", ") : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PrayersTable({ rows }: { rows: Awaited<ReturnType<typeof listPrayers>> }) {
  if (rows.length === 0) return <EmptyState label="prayer requests" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
            <div style={{ fontWeight: 700, fontSize: "14px" }}>{r.name ?? "(anonymous)"}</div>
            <div style={{ color: "#9aa3b8", fontSize: "12.5px", whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</div>
          </div>
          {r.contact && (
            <div style={{ color: "#cdd3e0", fontSize: "12.5px", marginTop: "3px" }}>
              {r.contact}
            </div>
          )}
          <p style={{ color: "#f4f1ea", fontSize: "14px", lineHeight: 1.55, marginTop: "12px", whiteSpace: "pre-wrap" }}>
            {r.request}
          </p>
        </div>
      ))}
    </div>
  );
}

function FeedbackTable({ rows }: { rows: Awaited<ReturnType<typeof listFeedback>> }) {
  if (rows.length === 0) return <EmptyState label="feedback" />;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      {rows.map((r) => (
        <div
          key={r.id}
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "14px",
            padding: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ fontWeight: 700, fontSize: "14px" }}>{r.name ?? "(anonymous)"}</div>
              <span
                style={{
                  background: "rgba(231,184,78,.15)",
                  color: "#e7b84e",
                  fontSize: "10.5px",
                  fontWeight: 800,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  padding: "4px 9px",
                  borderRadius: "5px",
                }}
              >
                {r.category}
              </span>
              {r.rating !== null && r.rating > 0 && (
                <span style={{ color: "#e7b84e", fontSize: "13px", fontWeight: 800 }}>
                  {"★".repeat(r.rating)}
                  <span style={{ color: "rgba(231,184,78,.25)" }}>{"★".repeat(5 - r.rating)}</span>
                </span>
              )}
            </div>
            <div style={{ color: "#9aa3b8", fontSize: "12.5px", whiteSpace: "nowrap" }}>{fmtDate(r.created_at)}</div>
          </div>
          <p style={{ color: "#f4f1ea", fontSize: "14px", lineHeight: 1.55, marginTop: "12px", whiteSpace: "pre-wrap" }}>
            {r.message}
          </p>
        </div>
      ))}
    </div>
  );
}

function SignupsTable({ rows }: { rows: Awaited<ReturnType<typeof listSignups>> }) {
  if (rows.length === 0) return <EmptyState label="event signups" />;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={tableStyle}>
        <thead>
          <tr>
            <th style={thStyle}>When</th>
            <th style={thStyle}>Event</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Contact</th>
            <th style={thStyle}>Role</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td style={{ ...tdStyle, whiteSpace: "nowrap", color: "#9aa3b8" }}>{fmtDate(r.created_at)}</td>
              <td style={tdStyle}>
                {r.events ? (
                  <Link href={`/events/${r.events.slug}`} style={{ color: "#e7b84e", textDecoration: "none" }}>
                    {r.events.title}
                  </Link>
                ) : (
                  <span style={{ color: "#6a738b" }}>—</span>
                )}
              </td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{r.name}</td>
              <td style={tdStyle}>{r.contact}</td>
              <td style={tdStyle}>
                <span
                  style={{
                    background: r.role === "volunteer" ? "rgba(78,184,107,.15)" : "rgba(78,141,231,.15)",
                    color: r.role === "volunteer" ? "#7ed996" : "#7eaef0",
                    fontSize: "10.5px",
                    fontWeight: 800,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    padding: "4px 9px",
                    borderRadius: "5px",
                  }}
                >
                  {r.role}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
