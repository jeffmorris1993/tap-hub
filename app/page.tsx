import Link from "next/link";
import { PhoneShell } from "../components/PhoneShell";
import { HubTopBar } from "../components/HubTopBar";
import { TodayBanner } from "../components/TodayBanner";
import { HubTile } from "../components/HubTile";

const CHURCH_PHONE = "+12485551234";
const CHURCH_ADDRESS_Q = "Nehemiah's Temple Madison Heights MI";
const LIVE_STREAM_URL = process.env.LIVE_STREAM_URL ?? "";
const GIVE_URL = process.env.NEXT_PUBLIC_EXTERNAL_GIVE_URL ?? "";

export default function Hub() {
  return (
    <PhoneShell>
      <div className="th-fade">
        <HubTopBar />

        {/* greeting */}
        <div style={{ padding: "14px 20px 4px" }}>
          <h1
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "34px",
              lineHeight: 0.96,
              letterSpacing: "0.005em",
            }}
          >
            Welcome.
            <br />
            <span style={{ color: "#e7b84e" }}>Get plugged in.</span>
          </h1>
          <p
            style={{
              color: "#9aa3b8",
              fontSize: "14.5px",
              fontWeight: 500,
              lineHeight: 1.5,
              marginTop: "10px",
            }}
          >
            Tap below for everything happening at Neh Temple and how to get connected.
          </p>
        </div>

        <TodayBanner />

        {/* I'm New feature */}
        <Link
          href="/new-here"
          style={{
            margin: "14px 20px 0",
            background: "#e7b84e",
            borderRadius: "16px",
            padding: "20px",
            display: "flex",
            alignItems: "center",
            gap: "16px",
            boxShadow: "0 14px 34px -12px rgba(231,184,78,.5)",
            textDecoration: "none",
            color: "inherit",
          }}
        >
          <span
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "13px",
              background: "rgba(11,16,28,.12)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg
              width="27"
              height="27"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#0b101c"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 3l2.3 4.7 5.2.8-3.8 3.7.9 5.2L12 15.7 7.4 18.1l.9-5.2L4.5 9.2l5.2-.8z" />
            </svg>
          </span>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "23px",
                color: "#0b101c",
                lineHeight: 1,
              }}
            >
              I&apos;m New Here
            </div>
            <div
              style={{
                fontSize: "13px",
                fontWeight: 700,
                color: "#6b531a",
                marginTop: "4px",
              }}
            >
              First time? Tell us about you →
            </div>
          </div>
        </Link>

        {/* 2x2 grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            padding: "14px 20px 0",
          }}
        >
          <HubTile
            href="/events"
            title="Events & Signups"
            sub="Browse & register"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <rect x="4" y="5" width="16" height="16" rx="2.5" />
                <path d="M4 9.5h16M8 3v4M16 3v4" />
              </svg>
            }
          />
          <HubTile
            href="/kids-youth"
            title="Kids + Youth"
            sub="Ignite & all ages"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="9" cy="8" r="2.4" />
                <circle cx="16" cy="9.5" r="1.9" />
                <path d="M4 19c0-3 2.2-4.8 5-4.8s5 1.8 5 4.8M14.5 19c0-2 .9-3.3 2.8-3.7" />
              </svg>
            }
          />
          <HubTile
            href={GIVE_URL || "#"}
            external
            title="Give"
            sub="Support the ministry"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.5-7-10a4 4 0 017-2.6A4 4 0 0119 11c0 5.5-7 10-7 10z" />
              </svg>
            }
          />
          <HubTile
            href="/feedback"
            title="Feedback / Prayer"
            sub="Share or request"
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a8 8 0 01-11.6 7.1L4 20.5l1.4-5.3A8 8 0 1121 12z" />
              </svg>
            }
          />
        </div>

        {/* quick actions */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: LIVE_STREAM_URL ? "1fr 1fr 1fr" : "1fr 1fr",
            gap: "10px",
            padding: "16px 20px 0",
          }}
        >
          <QuickAction href={`tel:${CHURCH_PHONE}`} label="Call" icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 4h3l1.5 4-2 1.5a11 11 0 005 5l1.5-2 4 1.5v3a2 2 0 01-2 2A16 16 0 013 6a2 2 0 012-2z" />
            </svg>
          } />
          <QuickAction
            href={`https://maps.google.com/?q=${encodeURIComponent(CHURCH_ADDRESS_Q)}`}
            target="_blank"
            label="Directions"
            icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 21s-7-4.5-7-10a7 7 0 1114 0c0 5.5-7 10-7 10z" />
                <circle cx="12" cy="11" r="2.5" />
              </svg>
            }
          />
          {LIVE_STREAM_URL && (
            <QuickAction href={LIVE_STREAM_URL} target="_blank" label="Watch" icon={
              <svg width="20" height="20" viewBox="0 0 24 24" fill="#e7b84e">
                <path d="M6 4l14 8-14 8z" />
              </svg>
            } />
          )}
        </div>

        {/* footer */}
        <div style={{ padding: "24px 20px 32px", textAlign: "center" }}>
          <div
            style={{
              fontSize: "12px",
              fontWeight: 700,
              color: "#6a738b",
              lineHeight: 1.6,
            }}
          >
            Nehemiah&apos;s Temple Apostolic Church
            <br />
            Madison Heights, Michigan 48071
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}

function QuickAction({
  href,
  target,
  label,
  icon,
}: {
  href: string;
  target?: string;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <a
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      style={{
        textDecoration: "none",
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "13px",
        padding: "14px 6px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "7px",
        color: "inherit",
      }}
    >
      {icon}
      <span
        style={{
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          color: "#cdd3e0",
        }}
      >
        {label}
      </span>
    </a>
  );
}
