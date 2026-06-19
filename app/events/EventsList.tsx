"use client";

import Link from "next/link";
import { useState } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { EventHero } from "../../components/EventHero";
import type { DisplayEvent } from "../../lib/events-display";
import type { EventCategory } from "../../lib/supabase/queries";

const TABS: ("All" | EventCategory)[] = ["All", "Worship", "Youth", "Community"];

export function EventsList({ events }: { events: DisplayEvent[] }) {
  const [filter, setFilter] = useState<(typeof TABS)[number]>("All");
  const list = filter === "All" ? events : events.filter((e) => e.category === filter);

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="Events & Signups" subtitle="Tap an event to register" />

        <div
          className="tap-scroll"
          style={{ padding: "16px 18px 8px", display: "flex", gap: "8px", overflowX: "auto" }}
        >
          {TABS.map((t) => {
            const on = t === filter;
            return (
              <button
                key={t}
                onClick={() => setFilter(t)}
                style={{
                  whiteSpace: "nowrap",
                  fontWeight: 800,
                  fontSize: "12.5px",
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  padding: "11px 18px",
                  borderRadius: "10px",
                  cursor: "pointer",
                  background: on ? "#e7b84e" : "#121a2e",
                  color: on ? "#0b101c" : "#cdd3e0",
                  border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
                }}
              >
                {t}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "8px 18px 40px", display: "flex", flexDirection: "column", gap: "14px" }}>
          {list.length === 0 && (
            <div style={{ color: "#9aa3b8", fontSize: "14px", textAlign: "center", padding: "40px 16px" }}>
              No events yet in this category.
            </div>
          )}
          {list.map((e) => (
            <Link
              key={e.slug}
              href={`/events/${e.slug}`}
              style={{
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "16px",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
                display: "block",
              }}
            >
              <EventHero hue={e.hue}>
                <div
                  style={{
                    position: "absolute",
                    top: "12px",
                    left: "12px",
                    background: "#e7b84e",
                    borderRadius: "9px",
                    textAlign: "center",
                    padding: "8px 12px",
                    lineHeight: 1,
                  }}
                >
                  <div
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      color: "#6b531a",
                    }}
                  >
                    {e.month}
                  </div>
                  <div
                    style={{
                      fontFamily: "var(--font-anton)",
                      fontSize: "21px",
                      color: "#0b101c",
                      marginTop: "2px",
                    }}
                  >
                    {e.day}
                  </div>
                </div>
                <span
                  style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    background: "rgba(7,11,20,.82)",
                    backdropFilter: "blur(4px)",
                    color: "#e7b84e",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "6px 10px",
                    borderRadius: "6px",
                  }}
                >
                  {e.category}
                </span>
              </EventHero>
              <div style={{ padding: "16px 16px 18px" }}>
                <div
                  style={{
                    fontSize: "11.5px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#e7b84e",
                  }}
                >
                  {e.whenText}
                </div>
                <h3
                  style={{
                    fontFamily: "var(--font-anton)",
                    fontWeight: 400,
                    textTransform: "uppercase",
                    fontSize: "19px",
                    marginTop: "6px",
                    lineHeight: 1.04,
                  }}
                >
                  {e.title}
                </h3>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "12px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12.5px",
                      color: "#9aa3b8",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                    }}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#9aa3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 21s-7-4.5-7-10a7 7 0 1114 0c0 5.5-7 10-7 10z" />
                      <circle cx="12" cy="11" r="2.3" />
                    </svg>
                    {e.location}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                      color: "#e7b84e",
                      fontSize: "12px",
                      fontWeight: 800,
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                    }}
                  >
                    Details
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path d="M9 6l6 6-6 6" stroke="#e7b84e" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
