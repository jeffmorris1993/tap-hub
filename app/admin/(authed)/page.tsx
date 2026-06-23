import Link from "next/link";
import {
  getDashboardCounts,
  getRecentActivity,
  listPendingEvents,
  type ActivityItem,
  type ActivityKind,
} from "../../../lib/supabase/admin-queries";
import { fmtDateTime } from "../../../lib/format";
import { CHURCH_TZ } from "../../../lib/tz";

export const dynamic = "force-dynamic";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Welcome";
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  if (hour < 21) return "Good evening";
  return "Good night";
}

function detroitHour(): number {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CHURCH_TZ,
    hour: "2-digit",
    hourCycle: "h23",
  });
  return parseInt(fmt.formatToParts(new Date()).find((p) => p.type === "hour")?.value ?? "0", 10);
}

const ACTIVITY_ICONS: Record<ActivityKind, string> = {
  visitor: "👋",
  prayer: "🙏",
  feedback: "💬",
  signup: "✅",
};

export default async function AdminDashboard() {
  const [counts, recent, pending] = await Promise.all([
    getDashboardCounts(),
    getRecentActivity(6),
    listPendingEvents(),
  ]);
  const greeting = greetingForHour(detroitHour());

  const stats = [
    {
      label: "I'm New",
      value: counts.visitors,
      sub: `${counts.recentVisitors24h} in last 24h`,
      subColor: counts.recentVisitors24h > 0 ? "#7ed996" : "#9aa3b8",
      href: "/admin/submissions?tab=visitors",
    },
    {
      label: "Pending approval",
      value: counts.pendingEvents,
      sub: counts.pendingEvents > 0 ? "Needs review" : "Inbox zero",
      subColor: counts.pendingEvents > 0 ? "#e7b84e" : "#7ed996",
      href: "/admin/events/pending",
    },
    {
      label: "Prayer requests",
      value: counts.prayers,
      sub: "All-time",
      subColor: "#9aa3b8",
      href: "/admin/submissions?tab=prayers",
    },
    {
      label: "Published events",
      value: counts.publishedEvents,
      sub: `${counts.signups} signups`,
      subColor: "#9aa3b8",
      href: "/admin/events",
    },
  ];

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
        {greeting} — here&apos;s what&apos;s going on at TapHub.
      </p>

      {/* stat tiles */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginTop: "18px",
        }}
      >
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            style={{
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.08)",
              borderRadius: "16px",
              padding: "18px 20px",
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <div
              style={{
                fontSize: "11px",
                fontWeight: 800,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#6a738b",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-anton)",
                fontSize: "34px",
                color: "#f4f1ea",
                lineHeight: 1,
                margin: "8px 0 5px",
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: "12.5px", color: s.subColor, fontWeight: 700 }}>{s.sub}</div>
          </Link>
        ))}
      </div>

      {/* two-column: pending queue + recent activity */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "18px",
          marginTop: "22px",
        }}
      >
        {/* pending approvals queue */}
        <div
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "18px",
            padding: "20px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "14px" }}>
            <h3
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "18px",
                color: "#f4f1ea",
              }}
            >
              Pending approval
            </h3>
            {pending.length > 0 ? (
              <Link
                href="/admin/events/pending"
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#e7b84e",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  textDecoration: "none",
                }}
              >
                View all →
              </Link>
            ) : (
              <span
                style={{
                  fontSize: "11px",
                  fontWeight: 800,
                  color: "#6a738b",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                }}
              >
                0 waiting
              </span>
            )}
          </div>

          {pending.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "#6a738b",
                fontSize: "13px",
                fontWeight: 600,
                padding: "32px 18px",
              }}
            >
              Nothing waiting. You&apos;re all caught up. 🙌
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {pending.slice(0, 5).map((e) => (
                <Link
                  key={e.id}
                  href={`/admin/events/${e.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "13px",
                    background: "#1a2438",
                    border: "1px solid rgba(244,241,234,.06)",
                    borderRadius: "13px",
                    padding: "13px 15px",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <span
                    style={{
                      width: "40px",
                      height: "40px",
                      borderRadius: "10px",
                      background: "#121a2e",
                      color: "#e7b84e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      fontFamily: "var(--font-anton)",
                      fontSize: "16px",
                    }}
                  >
                    {new Date(e.starts_at).toLocaleDateString("en-US", {
                      timeZone: CHURCH_TZ,
                      day: "2-digit",
                    })}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "14px", color: "#f4f1ea" }}>{e.title}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9aa3b8",
                        fontWeight: 600,
                        marginTop: "1px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.submitted_by ?? "(unknown)"} · {e.submitted_at ? fmtDateTime(e.submitted_at) : "—"}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 800,
                      color: "#e7b84e",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      flexShrink: 0,
                    }}
                  >
                    Review →
                  </span>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* recent activity */}
        <div
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "18px",
            padding: "20px",
          }}
        >
          <h3
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "18px",
              color: "#f4f1ea",
              marginBottom: "14px",
            }}
          >
            Recent activity
          </h3>

          {recent.length === 0 ? (
            <div style={{ color: "#6a738b", fontSize: "13px", fontWeight: 600, padding: "18px 0" }}>
              No submissions yet.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              {recent.map((r: ActivityItem, i) => (
                <div key={i} style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                  <span
                    style={{
                      width: "32px",
                      height: "32px",
                      borderRadius: "9px",
                      background: "#1a2438",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "16px",
                      flexShrink: 0,
                    }}
                  >
                    {ACTIVITY_ICONS[r.kind]}
                  </span>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: "13.5px", color: "#f4f1ea" }}>{r.title}</div>
                    <div
                      style={{
                        fontSize: "12px",
                        color: "#9aa3b8",
                        fontWeight: 600,
                        marginTop: "1px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {r.meta}
                    </div>
                    <div style={{ fontSize: "11px", color: "#6a738b", marginTop: "3px" }}>
                      {fmtDateTime(r.created_at)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
