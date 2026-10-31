"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { LivePoller } from "../../../../../components/LivePoller";
import { LogoMark } from "../../../../../components/LogoMark";
import { addWalkin, undoWalkin } from "./actions";

/**
 * Minimal Wake Lock typings — lib.dom.d.ts doesn't ship them yet, and the API
 * is optional everywhere (Safari has no support at all).
 */
type WakeLockSentinel = { release: () => Promise<void> };
type WakeLockNavigator = Navigator & {
  wakeLock?: { request: (type: "screen") => Promise<WakeLockSentinel> };
};

const chromeButton: React.CSSProperties = {
  minHeight: "44px",
  padding: "0 14px",
  borderRadius: "10px",
  border: "1px solid rgba(244,241,234,.18)",
  background: "#121a2e",
  color: "#cdd3e0",
  fontWeight: 700,
  fontSize: "14px",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  textDecoration: "none",
};

export function DisplayView({
  serviceId,
  occurrenceDate,
  name,
  windowLabel,
  isOpen,
  qrSvg,
  typedUrl,
  checkins,
  walkins,
  exitHref,
}: {
  serviceId: string;
  occurrenceDate: string;
  name: string;
  windowLabel: string;
  isOpen: boolean;
  /** Pre-rendered inline SVG — see lib/qr.ts. */
  qrSvg: string;
  /** Bare host for the "no camera?" fallback line. */
  typedUrl: string;
  checkins: number;
  walkins: number;
  exitHref: string;
}) {
  // Walk-ins added on this screen, newest last — Undo can only take back our
  // own taps, and the count shows immediately rather than waiting for a poll.
  const [added, setAdded] = useState<string[]>([]);
  const [removed, setRemoved] = useState(0);
  const [busy, setBusy] = useState(false);
  const [wakeHeld, setWakeHeld] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lock = useRef<WakeLockSentinel | null>(null);

  // The poll re-renders with the server's numbers; our optimistic delta is
  // whatever we've added minus what we've undone since that render.
  const serverTotal = checkins + walkins;
  const total = Math.max(0, serverTotal + added.length - removed);

  // Keep the screen awake. Not supported everywhere, so the footer tells
  // whoever set the kiosk up whether they still need to disable auto-lock.
  useEffect(() => {
    const nav = navigator as WakeLockNavigator;
    if (!nav.wakeLock) return;
    let cancelled = false;
    nav.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (cancelled) {
          void sentinel.release();
          return;
        }
        lock.current = sentinel;
        setWakeHeld(true);
      })
      .catch(() => {
        // Denied (often a background tab) — the footer hint covers it.
      });
    return () => {
      cancelled = true;
      void lock.current?.release();
      lock.current = null;
    };
  }, []);

  const onAdd = useCallback(async () => {
    setError(null);
    setBusy(true);
    const r = await addWalkin({ serviceId, occurrenceDate });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setAdded((ids) => [...ids, r.walkinId]);
  }, [serviceId, occurrenceDate]);

  const onUndo = useCallback(async () => {
    const last = added[added.length - 1];
    if (!last) return;
    setError(null);
    setBusy(true);
    const r = await undoWalkin({ walkinId: last });
    setBusy(false);
    if (!r.ok) {
      setError(r.error);
      return;
    }
    setAdded((ids) => ids.slice(0, -1));
    setRemoved((n) => n + 1);
  }, [added]);

  function toggleFullscreen() {
    const el = document.documentElement;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.().catch(() => {
        // Some kiosk browsers refuse outside a user gesture chain; harmless.
      });
    }
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0b101c",
        color: "#f4f1ea",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <LivePoller intervalMs={10_000} />

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          padding: "14px 18px",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <LogoMark size="md" />
          <span
            style={{
              fontFamily: "var(--font-anton)",
              textTransform: "uppercase",
              fontSize: "15px",
            }}
          >
            Nehemiah&apos;s Temple
          </span>
        </span>
        <span style={{ display: "flex", gap: "8px" }}>
          <button type="button" onClick={toggleFullscreen} style={chromeButton}>
            Full screen
          </button>
          <Link href={exitHref} style={chromeButton}>
            Exit
          </Link>
        </span>
      </div>

      <div
        style={{
          flex: 1,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "center",
          gap: "clamp(24px, 5vw, 72px)",
          padding: "16px 24px 32px",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "16px",
            maxWidth: "460px",
            textAlign: "center",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontSize: "14px",
              fontWeight: 800,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#e7b84e",
            }}
          >
            Welcome to
          </span>
          <h1
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "clamp(40px, 6vw, 72px)",
              lineHeight: 0.95,
              textWrap: "balance",
            }}
          >
            {name}
          </h1>
          <p style={{ fontSize: "clamp(20px, 2.4vw, 26px)", fontWeight: 700, lineHeight: 1.35 }}>
            {isOpen
              ? "Scan with your phone camera to check in"
              : "Check-in isn't open just yet"}
          </p>
          <p style={{ color: "#aab3c5", fontSize: "17px", lineHeight: 1.5 }}>
            No camera? Go to <strong style={{ color: "#f4f1ea" }}>{typedUrl}</strong>, tap Check
            In, and choose {name} if asked.
          </p>
          <span
            style={{
              padding: "8px 16px",
              borderRadius: "999px",
              background: isOpen ? "rgba(231,184,78,.12)" : "#121a2e",
              border: `1px solid ${isOpen ? "rgba(231,184,78,.35)" : "rgba(244,241,234,.12)"}`,
              color: isOpen ? "#e7b84e" : "#aab3c5",
              fontSize: "14px",
              fontWeight: 800,
            }}
          >
            {windowLabel}
          </span>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
          <div
            style={{
              width: "min(78vw, 400px)",
              aspectRatio: "1",
              background: "#ffffff",
              borderRadius: "24px",
              padding: "22px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              role="img"
              aria-label={`Check-in QR code for ${name}`}
              style={{ width: "100%", height: "100%" }}
              // Generated server-side by lib/qr.ts from our own URL — no
              // user-supplied content reaches this markup.
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
          </div>

          <div
            role="status"
            style={{
              display: "flex",
              alignItems: "baseline",
              gap: "10px",
              padding: "12px 22px",
              borderRadius: "999px",
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.12)",
            }}
          >
            <span
              style={{
                fontFamily: "var(--font-anton)",
                fontSize: "30px",
                color: "#e7b84e",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {total}
            </span>
            <span style={{ fontWeight: 700, fontSize: "17px" }}>
              {total === 1 ? "person checked in" : "people checked in"}
            </span>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              alignItems: "center",
              maxWidth: "400px",
              textAlign: "center",
            }}
          >
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", justifyContent: "center" }}>
              <button
                type="button"
                onClick={onAdd}
                disabled={busy}
                style={{
                  minHeight: "52px",
                  padding: "0 20px",
                  borderRadius: "12px",
                  border: "1.5px solid rgba(244,241,234,.25)",
                  background: "#121a2e",
                  color: "#f4f1ea",
                  fontWeight: 800,
                  fontSize: "16px",
                  cursor: busy ? "wait" : "pointer",
                  opacity: busy ? 0.7 : 1,
                }}
              >
                + Count a walk-in
              </button>
              {added.length > 0 && (
                <button
                  type="button"
                  onClick={onUndo}
                  disabled={busy}
                  style={{
                    minHeight: "52px",
                    padding: "0 18px",
                    border: "none",
                    background: "transparent",
                    color: "#aab3c5",
                    fontWeight: 700,
                    fontSize: "15px",
                    cursor: busy ? "wait" : "pointer",
                    textDecoration: "underline",
                    textUnderlineOffset: "4px",
                  }}
                >
                  Undo
                </button>
              )}
            </div>
            {error ? (
              <span role="alert" style={{ color: "#e0707d", fontSize: "14px", fontWeight: 700 }}>
                {error}
              </span>
            ) : (
              <span
                style={{
                  color: "#7e889e",
                  fontSize: "13.5px",
                  fontWeight: 600,
                  lineHeight: 1.45,
                }}
              >
                For someone who can&apos;t check in on a phone. Adds to the total without a name.
                {walkins > 0 ? ` ${walkins} counted so far.` : ""}
              </span>
            )}
          </div>
        </div>
      </div>

      <p
        style={{
          textAlign: "center",
          color: "#7e889e",
          fontSize: "14px",
          fontWeight: 600,
          padding: "0 20px 18px",
        }}
      >
        {wakeHeld
          ? "This screen will stay on while it's open."
          : "Tip: turn off auto-lock on this device so the screen stays on."}
      </p>
    </div>
  );
}
