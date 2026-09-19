import Link from "next/link";
import { requirePortalUser } from "../../../../lib/portal-auth";
import { listMySignups } from "../../../../lib/supabase/admin-queries";
import { CHURCH_TZ } from "../../../../lib/tz";
import { CancelButton } from "./CancelButton";

export const dynamic = "force-dynamic";

function fmtOccurrence(dateIso: string | null, startsAt: string | null): string {
  if (dateIso) {
    return new Date(`${dateIso}T12:00:00Z`).toLocaleDateString("en-US", {
      timeZone: "UTC",
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  if (startsAt) {
    return new Date(startsAt).toLocaleDateString("en-US", {
      timeZone: CHURCH_TZ,
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }
  return "Date TBD";
}

export default async function MyEvents() {
  const pu = await requirePortalUser();
  const signups = await listMySignups(pu.user.id, pu.email);

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 600, marginBottom: "18px" }}>
        Events you&apos;ve signed up to attend or volunteer for.
      </p>

      {signups.length === 0 ? (
        <div
          style={{
            color: "#6a738b",
            fontSize: "14px",
            fontWeight: 600,
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          No signups yet.{" "}
          <Link href="/events" style={{ color: "#e7b84e", textDecoration: "none", fontWeight: 800 }}>
            Browse events
          </Link>{" "}
          to get involved.
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px" }}>
          {signups.map((s) => (
            <div
              key={s.id}
              style={{
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "16px",
                padding: "18px",
                display: "flex",
                flexDirection: "column",
              }}
            >
              <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "10px" }}>
                <span
                  style={{
                    display: "inline-block",
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
              <h3
                style={{
                  fontFamily: "var(--font-anton)",
                  fontWeight: 400,
                  textTransform: "uppercase",
                  fontSize: "19px",
                  color: "#f4f1ea",
                  marginTop: "12px",
                  lineHeight: 1.05,
                }}
              >
                {s.events ? (
                  <Link
                    href={`/events/${s.events.slug}${s.occurrence_date ? `?date=${s.occurrence_date}` : ""}`}
                    style={{ color: "inherit", textDecoration: "none" }}
                  >
                    {s.events.title}
                  </Link>
                ) : (
                  "Event"
                )}
              </h3>
              <div
                style={{
                  fontSize: "13px",
                  color: "#9aa3b8",
                  fontWeight: 600,
                  marginTop: "8px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px",
                  flex: 1,
                }}
              >
                <span>{fmtOccurrence(s.occurrence_date, s.events?.starts_at ?? null)}</span>
                {s.events?.location && <span>{s.events.location}</span>}
              </div>
              <div style={{ marginTop: "16px" }}>
                {s.owned ? (
                  <CancelButton signupId={s.id} />
                ) : (
                  <span style={{ color: "#6a738b", fontSize: "11.5px", fontWeight: 600 }}>
                    Signed up before you had an account — contact the office to change it.
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
