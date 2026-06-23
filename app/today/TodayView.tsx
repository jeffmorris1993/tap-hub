"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import { SectionLabel } from "../../components/SectionLabel";
import { ScheduleRow } from "../../components/ScheduleRow";
import { LiveClock } from "../../components/LiveClock";
import { getTodayStatus, type ScheduleRow as ClockRow } from "../../lib/clock";
import { buildHero, type Hero } from "../../lib/hero";
import type { DisplayEvent } from "../../lib/events-display";
import { buildTodayTimeline, type TimelineRow } from "../../lib/today-timeline";

export type WeekRow = { day_label: string; title: string; detail: string };
export type EveningInfo = { label: string; where: string; time: string } | null;

function minutesToTime(mins: number): { time: string; ampm: string; combined: string } {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const time = `${h}:${m < 10 ? "0" + m : m}`;
  return { time, ampm, combined: `${time} ${ampm}` };
}

/** Render Sunday's schedule as "soon" rows (no live status — it's not today). */
function sundayRowsAsPreview(rows: ClockRow[]) {
  return [...rows]
    .sort((a, b) => a.startsAtMinutes - b.startsAtMinutes)
    .map((s) => {
      const t = minutesToTime(s.startsAtMinutes);
      return {
        label: s.label,
        where: s.where,
        time: t.time,
        ampm: t.ampm,
        status: "soon" as const,
      };
    });
}


export function TodayView({
  schedule,
  sundayFallback,
  weekLookahead,
  evening,
  todaysEvents,
}: {
  schedule: ClockRow[];
  sundayFallback: ClockRow[];
  weekLookahead: WeekRow[];
  evening: EveningInfo;
  todaysEvents: DisplayEvent[];
}) {
  const [status, setStatus] = useState(() => getTodayStatus(schedule, new Date()));
  const [hero, setHero] = useState<Hero>(() => buildHero(schedule, sundayFallback, new Date()));
  const [timeline, setTimeline] = useState<TimelineRow[]>(() =>
    buildTodayTimeline(schedule, todaysEvents, new Date()),
  );

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setStatus(getTodayStatus(schedule, now));
      setHero(buildHero(schedule, sundayFallback, now));
      setTimeline(buildTodayTimeline(schedule, todaysEvents, now));
    };
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, [schedule, sundayFallback, todaysEvents]);

  // When today has nothing scheduled (e.g. Saturday), show Sunday's rows
  // below the hero so the page isn't empty. Otherwise show the unified
  // schedule+events timeline.
  const fallbackRows = sundayRowsAsPreview(sundayFallback);
  const useFallback = status.rows.length === 0 && fallbackRows.length > 0;
  const visibleRows: TimelineRow[] = useFallback
    ? fallbackRows.map((r) => ({ ...r, sortMinutes: 0 }))
    : timeline;
  const scheduleLabel = useFallback ? "This Sunday's Schedule" : status.scheduleLabel;

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
                {hero.badge}
              </span>
            </div>
            <h2
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: hero.emphasis === "encouragement" ? "23px" : "27px",
                lineHeight: hero.emphasis === "encouragement" ? 1.15 : 1.02,
                marginTop: "14px",
              }}
            >
              {hero.headline}
            </h2>
            <p
              style={{
                color: "#9aa3b8",
                fontSize: "14px",
                fontWeight: hero.emphasis === "encouragement" ? 500 : 600,
                fontStyle: hero.emphasis === "encouragement" ? "italic" : "normal",
                marginTop: "6px",
              }}
            >
              {hero.sub}
            </p>
          </div>

          {/* unified timeline: standard schedule + today's events, chronological */}
          {visibleRows.length > 0 && (
            <>
              <SectionLabel style={{ margin: "26px 0 14px" }}>{scheduleLabel}</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {visibleRows.map((row, i) => (
                  <ScheduleRow key={i} row={row} href={row.href} />
                ))}
              </div>
            </>
          )}

          {/* evening / special */}
          {evening && (
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
                <div style={{ fontWeight: 800, fontSize: "15px" }}>{evening.label}</div>
                <div style={{ fontSize: "12.5px", color: "#9aa3b8", fontWeight: 600, marginTop: "2px" }}>
                  {evening.time} · {evening.where}
                </div>
              </div>
            </div>
          )}

          {/* this week */}
          {weekLookahead.length > 0 && (
            <>
              <SectionLabel style={{ margin: "28px 0 14px" }}>Coming Up This Week</SectionLabel>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {weekLookahead.map((w, i) => (
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
                        {w.day_label}
                      </span>
                    </span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: "14.5px" }}>{w.title}</div>
                      <div style={{ fontSize: "12px", color: "#9aa3b8", fontWeight: 600, marginTop: "2px" }}>
                        {w.detail}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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
