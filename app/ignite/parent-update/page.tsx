import Link from "next/link";
import type { Metadata } from "next";
import { PhoneShell } from "../../../components/PhoneShell";
import { BackBar } from "../../../components/BackBar";
import { igniteParentFormOpen, igniteParentFormCloseLabel } from "../../../lib/ignite-form";
import { ParentUpdateForm } from "./ParentUpdateForm";

export const metadata: Metadata = {
  title: "Ignite Parent Update · Nehemiah's Temple",
  description:
    "Parents & guardians: update your family information as we prepare for Ignite Youth in 2027.",
};

// The open/closed state is a function of the clock, so this can't be cached —
// otherwise the form would keep accepting (or refusing) for up to a revalidate
// window after the close date passes.
export const dynamic = "force-dynamic";

export default function ParentUpdate() {
  if (igniteParentFormOpen()) {
    return <ParentUpdateForm />;
  }

  // Closed, not gone. The QR code on the printed handouts keeps resolving, so
  // parents get an explanation instead of a 404.
  const closedOn = igniteParentFormCloseLabel();
  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="Ignite Parent Update" subtitle="Ignite Youth · 2027" />
        <div className="th-up" style={{ padding: "60px 26px", textAlign: "center" }}>
          <div
            style={{
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              background: "#1a2438",
              border: "1px solid rgba(244,241,234,.14)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto",
            }}
          >
            <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="#9aa3b8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="9" />
              <path d="M12 7v5l3 2" />
            </svg>
          </div>
          <h3
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "30px",
              marginTop: "22px",
            }}
          >
            This Form Is Closed
          </h3>
          <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 500, lineHeight: 1.6, marginTop: "12px" }}>
            {closedOn
              ? `The Ignite Youth parent & family update closed on ${closedOn}.`
              : "The Ignite Youth parent & family update is no longer accepting responses."}{" "}
            Thank you to everyone who shared with us.
          </p>
          <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.6, marginTop: "12px" }}>
            If you still need to reach us, talk with an Ignite leader on a Sunday or Wednesday, or
            send us a note through the Tap Hub.
          </p>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "10px",
              marginTop: "28px",
              alignItems: "center",
            }}
          >
            <Link
              href="/"
              style={{
                display: "inline-block",
                background: "#e7b84e",
                color: "#0b101c",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "15px 34px",
                borderRadius: "11px",
                textDecoration: "none",
              }}
            >
              Back to Tap Hub
            </Link>
            <Link
              href="/feedback"
              style={{
                display: "inline-block",
                background: "#1a2438",
                color: "#cdd3e0",
                border: "1px solid rgba(244,241,234,.14)",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "15px 34px",
                borderRadius: "11px",
                textDecoration: "none",
              }}
            >
              Send a Note
            </Link>
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
