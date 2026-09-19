import Link from "next/link";
import { listMySignups, listMyForms } from "../../../lib/supabase/admin-queries";
import type { PortalUser } from "../../../lib/portal-auth";
import { CHURCH_TZ } from "../../../lib/tz";

function fmtOccurrence(dateIso: string | null, startsAt: string | null): string {
  if (dateIso) {
    return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  if (startsAt) {
    return new Date(startsAt).toLocaleDateString("en-US", {
      timeZone: CHURCH_TZ,
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }
  return "";
}

const tileStyle: React.CSSProperties = {
  background: "#121a2e",
  border: "1px solid rgba(244,241,234,.08)",
  borderRadius: "16px",
  padding: "18px 20px",
  textDecoration: "none",
  color: "inherit",
  display: "block",
};

/** The member's landing view: their signups, forms, and quick links. */
export async function MemberOverview({ pu, greeting }: { pu: PortalUser; greeting: string }) {
  const [signups, forms] = await Promise.all([
    listMySignups(pu.user.id, pu.email),
    listMyForms(pu.user.id, pu.email),
  ]);
  const firstName = (pu.profile.full_name ?? "").split(/\s+/)[0] || "friend";

  const stats = [
    { label: "My Events", value: signups.length, sub: "signups", href: "/portal/my-events" },
    { label: "My Forms", value: forms.length, sub: "submitted", href: "/portal/my-forms" },
  ];

  const quickLinks = [
    { label: "Browse events", href: "/events" },
    { label: "Send a prayer request", href: "/feedback?tab=prayer" },
    { label: "Share feedback", href: "/feedback" },
    { label: "This week at Neh Temple", href: "/today" },
  ];

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 600, marginBottom: "4px" }}>
        {greeting}, {firstName} — here&apos;s your church life at a glance.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "14px",
          marginTop: "18px",
        }}
      >
        {stats.map((s) => (
          <Link key={s.label} href={s.href} style={tileStyle}>
            <div style={{ fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em", textTransform: "uppercase", color: "#6a738b" }}>
              {s.label}
            </div>
            <div style={{ fontFamily: "var(--font-anton)", fontSize: "34px", color: "#f4f1ea", lineHeight: 1, margin: "8px 0 5px" }}>
              {s.value}
            </div>
            <div style={{ fontSize: "12.5px", color: "#9aa3b8", fontWeight: 700 }}>{s.sub}</div>
          </Link>
        ))}
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "18px",
          marginTop: "22px",
        }}
      >
        <div style={{ background: "#121a2e", border: "1px solid rgba(244,241,234,.08)", borderRadius: "18px", padding: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-anton)", fontWeight: 400, textTransform: "uppercase", fontSize: "18px", color: "#f4f1ea", marginBottom: "14px" }}>
            What&apos;s next
          </h3>
          {signups.length === 0 ? (
            <div style={{ color: "#6a738b", fontSize: "13.5px", fontWeight: 600, padding: "12px 0" }}>
              No signups yet.{" "}
              <Link href="/events" style={{ color: "#e7b84e", textDecoration: "none", fontWeight: 800 }}>
                Browse events
              </Link>{" "}
              to get involved.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {signups.slice(0, 4).map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    background: "#1a2438",
                    border: "1px solid rgba(244,241,234,.06)",
                    borderRadius: "13px",
                    padding: "13px 15px",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 800, fontSize: "14px", color: "#f4f1ea" }}>
                      {s.events?.title ?? "Event"}
                    </div>
                    <div style={{ fontSize: "12px", color: "#9aa3b8", fontWeight: 600, marginTop: "1px" }}>
                      {fmtOccurrence(s.occurrence_date, s.events?.starts_at ?? null)}
                      {s.events?.location ? ` · ${s.events.location}` : ""}
                    </div>
                  </div>
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.07em",
                      textTransform: "uppercase",
                      padding: "5px 10px",
                      borderRadius: "6px",
                      background: s.role === "volunteer" ? "rgba(231,184,78,.16)" : "rgba(78,141,231,.16)",
                      color: s.role === "volunteer" ? "#e7b84e" : "#79a8ee",
                    }}
                  >
                    {s.role === "volunteer" ? "Volunteer" : "Attending"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ background: "#121a2e", border: "1px solid rgba(244,241,234,.08)", borderRadius: "18px", padding: "20px" }}>
          <h3 style={{ fontFamily: "var(--font-anton)", fontWeight: 400, textTransform: "uppercase", fontSize: "18px", color: "#f4f1ea", marginBottom: "14px" }}>
            Quick links
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {quickLinks.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  color: "#cdd3e0",
                  fontSize: "14px",
                  fontWeight: 700,
                  textDecoration: "none",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  background: "#1a2438",
                  border: "1px solid rgba(244,241,234,.06)",
                }}
              >
                <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#e7b84e", flexShrink: 0 }} />
                {l.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
