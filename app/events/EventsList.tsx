"use client";

import Link from "next/link";
import { useState } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
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
                display: "flex",
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "16px",
                overflow: "hidden",
                textDecoration: "none",
                color: "inherit",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  width: "78px",
                  background: "linear-gradient(160deg,#1c2740,#131c30)",
                  borderRight: "1px solid rgba(231,184,78,.16)",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "3px",
                }}
              >
                <span
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "#e7b84e",
                  }}
                >
                  {e.month}
                </span>
                <span
                  style={{
                    fontFamily: "var(--font-anton)",
                    fontSize: "33px",
                    color: "#f4f1ea",
                    lineHeight: 0.86,
                  }}
                >
                  {e.day}
                </span>
              </div>
              <div style={{ flex: 1, minWidth: 0, padding: "15px 16px" }}>
                <span
                  style={{
                    display: "inline-block",
                    background: "rgba(231,184,78,.14)",
                    color: "#e7b84e",
                    fontSize: "9.5px",
                    fontWeight: 800,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "5px 9px",
                    borderRadius: "6px",
                  }}
                >
                  {e.category}
                </span>
                <h3
                  style={{
                    fontFamily: "var(--font-anton)",
                    fontWeight: 400,
                    textTransform: "uppercase",
                    fontSize: "18px",
                    marginTop: "9px",
                    lineHeight: 1.05,
                  }}
                >
                  {e.title}
                </h3>
                <div
                  style={{
                    fontSize: "11px",
                    fontWeight: 800,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    color: "#9aa3b8",
                    marginTop: "8px",
                  }}
                >
                  {e.whenText}
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "12px",
                    gap: "10px",
                  }}
                >
                  <span
                    style={{
                      fontSize: "12px",
                      color: "#9aa3b8",
                      fontWeight: 700,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "6px",
                      minWidth: 0,
                    }}
                  >
                    <svg
                      width="13"
                      height="13"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#9aa3b8"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{ flexShrink: 0 }}
                    >
                      <path d="M12 21s-7-4.5-7-10a7 7 0 1114 0c0 5.5-7 10-7 10z" />
                      <circle cx="12" cy="11" r="2.3" />
                    </svg>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {e.location}
                    </span>
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
                      flexShrink: 0,
                    }}
                  >
                    Details
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M9 6l6 6-6 6"
                        stroke="#e7b84e"
                        strokeWidth="2.4"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
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
