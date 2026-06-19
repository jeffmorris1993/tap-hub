import Link from "next/link";
import { getDashboardCounts } from "../../../lib/supabase/admin-queries";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const counts = await getDashboardCounts();

  const tiles = [
    { label: "I'm New submissions", value: counts.visitors, href: "/admin/submissions?tab=visitors" },
    { label: "Last 24h", value: counts.recentVisitors24h, href: "/admin/submissions?tab=visitors" },
    { label: "Prayer requests", value: counts.prayers, href: "/admin/submissions?tab=prayers" },
    { label: "Feedback", value: counts.feedback, href: "/admin/submissions?tab=feedback" },
    { label: "Event signups", value: counts.signups, href: "/admin/submissions?tab=signups" },
    { label: "Published events", value: counts.publishedEvents, href: "/admin/events" },
  ];

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          marginBottom: "6px",
        }}
      >
        Dashboard
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "14.5px", marginBottom: "28px" }}>
        At-a-glance counts for everything coming through TapHub.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "14px",
        }}
      >
        {tiles.map((t) => (
          <Link
            key={t.label}
            href={t.href}
            style={{
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.08)",
              borderRadius: "16px",
              padding: "22px",
              textDecoration: "none",
              color: "inherit",
              display: "block",
            }}
          >
            <div
              style={{
                fontFamily: "var(--font-anton)",
                fontSize: "44px",
                color: "#e7b84e",
                lineHeight: 1,
              }}
            >
              {t.value}
            </div>
            <div
              style={{
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                color: "#9aa3b8",
                marginTop: "10px",
              }}
            >
              {t.label}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
