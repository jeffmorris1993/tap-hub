import Link from "next/link";
import {
  listVisitors,
  listFeedback,
  listPrayers,
  listSignups,
  listIgniteFamilies,
} from "../../../../lib/supabase/admin-queries";
import { requireLead, ministryScope, type PortalUser } from "../../../../lib/portal-auth";
import { parseStoredResponses } from "../../../../lib/event-signup-forms";

export const dynamic = "force-dynamic";

type Tab = "visitors" | "feedback" | "prayers" | "signups" | "ignite";

const ALL_TABS: { key: Tab; label: string }[] = [
  { key: "visitors", label: "I'm New" },
  { key: "prayers", label: "Prayer Requests" },
  { key: "feedback", label: "Feedback" },
  { key: "signups", label: "Event Signups" },
  { key: "ignite", label: "Ignite Parents" },
];

// Visitor follow-ups are a pastoral surface; leads work their ministry's
// prayers, feedback, and signups. The Ignite parent roster is Youth-ministry
// data, so Youth leads see it too (it holds minors' details — no other
// ministry does).
const LEAD_TABS = ALL_TABS.filter((t) => t.key === "prayers" || t.key === "feedback" || t.key === "signups");
const IGNITE_TAB = ALL_TABS.filter((t) => t.key === "ignite");

export default async function Submissions({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const pu = await requireLead();
  const TABS =
    pu.role === "pastoral"
      ? ALL_TABS
      : pu.ministries.includes("Youth")
        ? [...LEAD_TABS, ...IGNITE_TAB]
        : LEAD_TABS;
  const params = await searchParams;
  const tab: Tab = (TABS.find((t) => t.key === params.tab)?.key ?? TABS[0].key) as Tab;

  const data = await loadTab(tab, pu);

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
              href={`/portal/submissions?tab=${t.key}`}
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
      {tab === "ignite" && <IgniteFamilies rows={data as Awaited<ReturnType<typeof listIgniteFamilies>>} />}
    </div>
  );
}

async function loadTab(tab: Tab, pu: PortalUser) {
  const scope = ministryScope(pu);
  if (tab === "visitors") return await listVisitors();
  if (tab === "prayers") return await listPrayers(100, scope);
  if (tab === "feedback") return await listFeedback(100, scope);
  if (tab === "ignite") return await listIgniteFamilies();
  return await listSignups(200, scope);
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

const VOLUNTEER_LABEL: Record<string, string> = {
  yes: "Yes — interested",
  maybe: "Maybe",
  not_now: "Not at this time",
};

const CONTACT_LABEL: Record<string, string> = {
  text: "Text",
  email: "Email",
  flocknote: "Flocknote",
  phone: "Phone Call",
};

function chipStyle(bg: string, color: string): React.CSSProperties {
  return {
    background: bg,
    color,
    fontSize: "10.5px",
    fontWeight: 800,
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    padding: "4px 9px",
    borderRadius: "5px",
    whiteSpace: "nowrap",
  };
}

function Answer({ label, value }: { label: string; value: string | null }) {
  if (!value) return null;
  return (
    <div>
      <div
        style={{
          fontSize: "10px",
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#6a738b",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <p style={{ margin: 0, fontSize: "13.5px", lineHeight: 1.55, color: "#cdd3e0", whiteSpace: "pre-wrap" }}>
        {value}
      </p>
    </div>
  );
}

function ExportBar() {
  const btn: React.CSSProperties = {
    background: "#121a2e",
    border: "1.5px solid rgba(244,241,234,.12)",
    borderRadius: "10px",
    color: "#e7b84e",
    fontSize: "12px",
    fontWeight: 800,
    letterSpacing: "0.05em",
    textTransform: "uppercase",
    padding: "11px 16px",
    textDecoration: "none",
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
  };
  return (
    <div style={{ display: "flex", gap: "10px", marginBottom: "18px", flexWrap: "wrap" }}>
      <a href="/portal/submissions/export?type=families" style={btn} download>
        ↓ Families CSV
      </a>
      <a href="/portal/submissions/export?type=youth" style={btn} download>
        ↓ Youth Roster CSV
      </a>
    </div>
  );
}

function IgniteFamilies({ rows }: { rows: Awaited<ReturnType<typeof listIgniteFamilies>> }) {
  if (rows.length === 0) {
    return (
      <>
        <ExportBar />
        <EmptyState label="Ignite parent submissions" />
      </>
    );
  }

  const childCount = rows.reduce((n, r) => n + r.ignite_children.length, 0);

  return (
    <>
      <ExportBar />
      <div style={{ color: "#9aa3b8", fontSize: "13px", marginBottom: "14px" }}>
        {rows.length} {rows.length === 1 ? "family" : "families"} · {childCount}{" "}
        {childCount === 1 ? "child" : "children"}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        {rows.map((f) => (
          <div
            key={f.id}
            style={{
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.08)",
              borderRadius: "14px",
              padding: "18px",
            }}
          >
            {/* guardian header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontWeight: 700, fontSize: "15px" }}>{f.guardian_name}</span>
                <span style={{ color: "#9aa3b8", fontSize: "12.5px" }}>{f.guardian_relationship}</span>
                <span style={chipStyle("rgba(231,184,78,.15)", "#e7b84e")}>
                  {CONTACT_LABEL[f.contact_preference] ?? f.contact_preference}
                </span>
                {f.volunteer_interest && (
                  <span
                    style={chipStyle(
                      f.volunteer_interest === "yes"
                        ? "rgba(78,184,107,.15)"
                        : f.volunteer_interest === "maybe"
                          ? "rgba(78,141,231,.15)"
                          : "rgba(154,163,184,.16)",
                      f.volunteer_interest === "yes"
                        ? "#7ed996"
                        : f.volunteer_interest === "maybe"
                          ? "#7eaef0"
                          : "#cdd3e0",
                    )}
                  >
                    {VOLUNTEER_LABEL[f.volunteer_interest]}
                  </span>
                )}
              </div>
              <div style={{ color: "#9aa3b8", fontSize: "12.5px", whiteSpace: "nowrap" }}>
                {fmtDate(f.created_at)}
              </div>
            </div>

            <div style={{ display: "flex", gap: "14px", marginTop: "6px", flexWrap: "wrap" }}>
              <a href={`tel:${f.guardian_phone}`} style={{ color: "#cdd3e0", fontSize: "13px", textDecoration: "none" }}>
                {f.guardian_phone}
              </a>
              <a href={`mailto:${f.guardian_email}`} style={{ color: "#e7b84e", fontSize: "13px", textDecoration: "none" }}>
                {f.guardian_email}
              </a>
            </div>

            {f.second_guardian_name && (
              <div style={{ color: "#9aa3b8", fontSize: "12.5px", marginTop: "6px" }}>
                Also: {f.second_guardian_name}
                {f.second_guardian_relationship && ` (${f.second_guardian_relationship})`}
                {f.second_guardian_phone && ` · ${f.second_guardian_phone}`}
                {f.second_guardian_email && ` · ${f.second_guardian_email}`}
              </div>
            )}

            {/* children */}
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "16px" }}>
              {f.ignite_children.map((c) => (
                <div
                  key={c.id}
                  style={{
                    background: "#0e1525",
                    border: "1px solid rgba(244,241,234,.06)",
                    borderLeft: "3px solid rgba(231,184,78,.5)",
                    borderRadius: "10px",
                    padding: "13px 15px",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", gap: "10px", flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, fontSize: "14px" }}>{c.full_name}</span>
                    <span style={{ color: "#9aa3b8", fontSize: "12.5px" }}>
                      {[
                        `Grade ${c.grade}`,
                        c.school,
                        `DOB ${c.date_of_birth}`,
                        c.tshirt_size,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", marginTop: "10px" }}>
                    <Answer label="Enjoys" value={c.interests} />
                    <Answer label="Needs most spiritually" value={c.spiritual_needs} />
                    <Answer label="How Ignite can support them" value={c.support_notes} />
                    {c.health_notes && (
                      <div
                        style={{
                          background: "rgba(181,50,65,.08)",
                          border: "1px solid rgba(181,50,65,.28)",
                          borderRadius: "8px",
                          padding: "10px 12px",
                        }}
                      >
                        <Answer label="Health / allergy / accessibility" value={c.health_notes} />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* family answers */}
            {(f.support_parents ||
              f.more_of_2027 ||
              f.wish_offered ||
              f.could_improve ||
              f.anything_else ||
              f.volunteer_areas.length > 0 ||
              f.participation_helps.length > 0) && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "12px",
                  marginTop: "16px",
                  paddingTop: "16px",
                  borderTop: "1px solid rgba(244,241,234,.07)",
                }}
              >
                <Answer label="How Ignite can support them as a parent" value={f.support_parents} />
                <Answer label="Would like more of in 2027" value={f.more_of_2027} />
                <Answer label="Wishes Ignite offered" value={f.wish_offered} />
                <Answer label="Could be improved" value={f.could_improve} />
                <Answer
                  label="Opportunity interests"
                  value={
                    f.volunteer_areas.length
                      ? f.volunteer_areas
                          .map((a) => (a === "Other" && f.volunteer_areas_other ? `Other: ${f.volunteer_areas_other}` : a))
                          .join(", ")
                      : null
                  }
                />
                <Answer
                  label="Would make participating easier"
                  value={
                    f.participation_helps.length
                      ? f.participation_helps
                          .map((h) =>
                            h === "Other" && f.participation_helps_other
                              ? `Other: ${f.participation_helps_other}`
                              : h,
                          )
                          .join(", ")
                      : null
                  }
                />
                <Answer label="Anything else" value={f.anything_else} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
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
            <th style={thStyle}>Date attending</th>
            <th style={thStyle}>Name</th>
            <th style={thStyle}>Contact</th>
            <th style={thStyle}>Role</th>
            <th style={thStyle}>Details</th>
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
              <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                {r.occurrence_date ? (
                  new Date(`${r.occurrence_date}T12:00:00Z`).toLocaleDateString("en-US", {
                    timeZone: "UTC",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })
                ) : (
                  <span style={{ color: "#6a738b" }}>—</span>
                )}
              </td>
              <td style={{ ...tdStyle, fontWeight: 700 }}>{r.name}</td>
              <td style={tdStyle}>{r.contact}</td>
              <td style={tdStyle}>
                <span style={{ display: "inline-flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
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
                  {r.attendance && (
                    <span
                      style={{
                        background: r.attendance === "yes" ? "rgba(78,184,107,.15)" : "rgba(231,184,78,.15)",
                        color: r.attendance === "yes" ? "#7ed996" : "#e7b84e",
                        fontSize: "10.5px",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        padding: "4px 9px",
                        borderRadius: "5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.attendance === "yes" ? "For sure" : "Not sure"}
                    </span>
                  )}
                </span>
              </td>
              <td style={{ ...tdStyle, maxWidth: "260px" }}>
                {(() => {
                  const responses = parseStoredResponses(r.responses);
                  if (responses.length === 0 && !r.notes) {
                    return <span style={{ color: "#6a738b" }}>—</span>;
                  }
                  return (
                    <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
                      {responses.map((resp) => (
                        <div key={resp.id} style={{ fontSize: "12px", color: "#9aa3b8", lineHeight: 1.4 }}>
                          <span style={{ color: "#6a738b", fontWeight: 700 }}>{resp.label}:</span>{" "}
                          <span style={{ color: "#cdd3e0" }}>
                            {Array.isArray(resp.value) ? resp.value.join(", ") : resp.value}
                          </span>
                        </div>
                      ))}
                      {r.notes && (
                        <div style={{ fontSize: "12px", color: "#9aa3b8", lineHeight: 1.4 }}>{r.notes}</div>
                      )}
                    </div>
                  );
                })()}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
