"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { SectionLabel } from "../../components/SectionLabel";
import { ScheduleRow } from "../../components/ScheduleRow";
import { LiveClock } from "../../components/LiveClock";
import { getTodayStatus, SEED_SUNDAY_SCHEDULE, SEED_WEEK_LOOKAHEAD } from "../../lib/clock";

// Phase 2 will read this from Supabase.
const EVENING_TONIGHT = false;

export default function Today() {
  const [status, setStatus] = useState(() => getTodayStatus(SEED_SUNDAY_SCHEDULE, new Date()));

  useEffect(() => {
    const tick = () => setStatus(getTodayStatus(SEED_SUNDAY_SCHEDULE, new Date()));
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="Today at Neh Temple" subtitle={<LiveClock />} />

        <div style={{ padding: "20px 18px 40px" }}>
          {/* hero */}
          <div
            style={{
              background: "linear-gradient(135deg,#15203a,#0f1626)",
              border: "1px solid rgba(231,184,78,.3)",
              borderRadius: "18px",
              padding: "20px",
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "8px",
                background: "rgba(231,184,78,.14)",
                borderRadius: "20px",
                padding: "6px 13px",
              }}
            >
              <span
                className="th-pulse"
                style={{ width: "9px", height: "9px", borderRadius: "50%", background: "#e7b84e" }}
              />
              <span
                style={{
                  fontSize: "10.5px",
                  fontWeight: 800,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#e7b84e",
                }}
              >
                {status.badge}
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "27px",
                lineHeight: 1.02,
                marginTop: "14px",
              }}
            >
              {status.headline}
            </h2>
            <p style={{ color: "#9aa3b8", fontSize: "14px", fontWeight: 600, marginTop: "6px" }}>
              {status.sub}
            </p>
          </div>

          {/* schedule */}
          <SectionLabel style={{ margin: "26px 0 14px" }}>{status.scheduleLabel}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {status.rows.map((row, i) => (
              <ScheduleRow key={i} row={row} />
            ))}
          </div>

          {/* evening / special */}
          {EVENING_TONIGHT && (
            <div
              style={{
                marginTop: "16px",
                background: "#1a2438",
                border: "1px solid rgba(231,184,78,.28)",
                borderRadius: "14px",
                padding: "16px",
                display: "flex",
                alignItems: "center",
                gap: "14px",
              }}
            >
              <span
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "11px",
                  background: "#0b101c",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#e7b84e"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z" />
                </svg>
              </span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 800, fontSize: "15px" }}>Evening Worship Tonight</div>
                <div style={{ fontSize: "12.5px", color: "#9aa3b8", fontWeight: 600, marginTop: "2px" }}>
                  6:00 PM · Main Sanctuary
                </div>
              </div>
            </div>
          )}

          {/* this week */}
          <SectionLabel style={{ margin: "28px 0 14px" }}>Coming Up This Week</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {SEED_WEEK_LOOKAHEAD.map((w, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "14px",
                  background: "#121a2e",
                  border: "1px solid rgba(244,241,234,.08)",
                  borderRadius: "13px",
                  padding: "14px 16px",
                }}
              >
                <span
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "11px",
                    background: "#1a2438",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <span
                    style={{
                      fontSize: "10px",
                      fontWeight: 800,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#e7b84e",
                    }}
                  >
                    {w.day}
                  </span>
                </span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: "14.5px" }}>{w.label}</div>
                  <div style={{ fontSize: "12px", color: "#9aa3b8", fontWeight: 600, marginTop: "2px" }}>
                    {w.detail}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <Link
            href="/events"
            style={{
              display: "block",
              width: "100%",
              marginTop: "20px",
              background: "#1a2438",
              color: "#fff",
              border: "1px solid rgba(244,241,234,.14)",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "15px",
              borderRadius: "12px",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            See All Events &amp; Sign Up
          </Link>
        </div>
      </div>
    </PhoneShell>
  );
}
