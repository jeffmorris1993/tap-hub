import Link from "next/link";
import { listAllEvents } from "../../../../lib/supabase/admin-queries";

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

export default async function AdminEvents() {
  const events = await listAllEvents();

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: "22px" }}>
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
          {events.map((e) => (
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
                  {!e.published && (
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
                      Draft
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
          ))}
        </div>
      )}
    </div>
  );
}
