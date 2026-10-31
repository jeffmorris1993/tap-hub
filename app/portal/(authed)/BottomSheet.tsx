"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Slide-up drawer on phones, centered modal from 960px up (see
 * portal-shell.css). Locking body scroll is the caller's job, since several
 * sheets can hand off to each other.
 *
 * Three ways out, because the drawer used to be a dead end on a phone:
 *  - the close button on the handle row,
 *  - dragging the handle down (the sheet tracks your finger),
 *  - the browser/Android back button, which closes the sheet instead of
 *    leaving the page.
 *
 * The scrim and the sheet render as siblings rather than parent and child: a
 * wrapping scrim would create a stacking context and trap the sheet below the
 * bottom tab bar, which is exactly what made tapping an adjacent tab need two
 * taps.
 */

/** Drag distance that dismisses on release. */
const DISMISS_PX = 90;
/** Flick speed (px/ms) that dismisses regardless of distance. */
const DISMISS_VELOCITY = 0.55;
const DESKTOP = "(min-width: 960px)";

/**
 * Scrim and sheet are separate elements, so a sheet opened on top of another
 * needs BOTH raised — a "stacked" scrim has to clear the base sheet (110),
 * not just its scrim. Scale documented in portal-shell.css.
 */
const LAYERS = {
  base: { scrim: 90, sheet: 110 },
  stacked: { scrim: 115, sheet: 120 },
} as const;

export function BottomSheet({
  label,
  onClose,
  children,
  layer = "base",
}: {
  /** Accessible name for the dialog. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** "stacked" for a sheet opened from another one (Customize over Account). */
  layer?: keyof typeof LAYERS;
}) {
  const z = LAYERS[layer];
  // Null when not dragging; a pixel offset (>= 0) while the finger is down.
  const [dragY, setDragY] = useState<number | null>(null);
  const drag = useRef<{ startY: number; startT: number; lastY: number; lastT: number } | null>(
    null,
  );

  // One guarded exit, so popstate -> onClose -> history.back() can't loop.
  const closing = useRef(false);
  const pushed = useRef(false);

  const close = useCallback(() => {
    if (closing.current) return;
    closing.current = true;
    // Take our own history entry back off the stack so the next Back press is
    // a real navigation rather than a no-op.
    if (pushed.current && typeof window !== "undefined") {
      pushed.current = false;
      window.history.back();
    }
    onClose();
  }, [onClose]);

  useEffect(() => {
    // A history entry of our own is what makes Back close the sheet instead of
    // leaving the page. If one is already on top we adopt it rather than stack
    // a second: Account hands off to Customize by unmounting and remounting,
    // and two entries would mean two Back presses to get out of one overlay.
    const current = window.history.state as { pshSheet?: unknown } | null;
    if (!current?.pshSheet) {
      window.history.pushState({ pshSheet: true }, "");
    }
    pushed.current = true;

    function onPop() {
      // Our entry is already gone — closing must not try to pop it again.
      pushed.current = false;
      if (closing.current) return;
      closing.current = true;
      onClose();
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
    }

    window.addEventListener("popstate", onPop);
    document.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("popstate", onPop);
      document.removeEventListener("keydown", onKey);
    };
    // Mount/unmount only: re-running would push another history entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onPointerDown(e: React.PointerEvent) {
    // Centered modal on desktop — nothing to drag.
    if (window.matchMedia(DESKTOP).matches) return;
    // Primary pointer only, and never a right-click.
    if (e.button !== 0) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    const t = e.timeStamp;
    drag.current = { startY: e.clientY, startT: t, lastY: e.clientY, lastT: t };
    setDragY(0);
  }

  function onPointerMove(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    d.lastY = e.clientY;
    d.lastT = e.timeStamp;
    // Downward only: dragging up shouldn't lift the sheet off the tab bar.
    setDragY(Math.max(0, e.clientY - d.startY));
  }

  function onPointerUp(e: React.PointerEvent) {
    const d = drag.current;
    drag.current = null;
    if (!d) return;
    e.currentTarget.releasePointerCapture?.(e.pointerId);

    const distance = Math.max(0, d.lastY - d.startY);
    const elapsed = Math.max(1, d.lastT - d.startT);
    const velocity = distance / elapsed;
    if (distance > DISMISS_PX || velocity > DISMISS_VELOCITY) {
      close();
      return;
    }
    setDragY(null); // Springs back via .psh-sheet-springy.
  }

  const dragging = dragY !== null;
  // Fade the backdrop in step with the drag, so the gesture feels connected.
  const scrimOpacity = dragging ? Math.max(0.25, 1 - dragY / 320) : 1;

  const sheetStyle: React.CSSProperties = dragging
    ? {
        zIndex: z.sheet,
        // An inline transform loses to a running animation, so stop it.
        animation: "none",
        transform: `translateY(${dragY}px)`,
      }
    : { zIndex: z.sheet };

  return (
    <>
      <div
        className="psh-scrim"
        style={{
          zIndex: z.scrim,
          opacity: scrimOpacity,
          transition: dragging ? "none" : undefined,
        }}
        onClick={close}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className={dragging ? "psh-sheet" : "psh-sheet psh-sheet-springy"}
        style={sheetStyle}
      >
        <div
          className="psh-sheet-drag"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            minHeight: "44px",
            marginBottom: "6px",
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <div
            className="psh-grabber"
            aria-hidden="true"
            style={{
              width: "44px",
              height: "5px",
              borderRadius: "3px",
              background: "rgba(244,241,234,.25)",
              margin: "0 auto",
            }}
          />
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              width: "44px",
              height: "44px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "transparent",
              border: "none",
              borderRadius: "10px",
              color: "#9aa3b8",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </>
  );
}

export const sheetHeading = {
  fontFamily: "var(--font-anton)",
  fontWeight: 400,
  textTransform: "uppercase" as const,
  color: "#f4f1ea",
  fontSize: "22px",
  lineHeight: 1.1,
};

/** Full-width sheet button; `tone` picks the accent. */
export function sheetButton(tone: "gold" | "quiet" | "danger") {
  const base = {
    minHeight: "54px",
    borderRadius: "12px",
    fontWeight: 800,
    fontSize: "15.5px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "10px",
    width: "100%",
    textDecoration: "none",
  };
  if (tone === "gold") {
    return { ...base, border: "none", background: "#e7b84e", color: "#0b101c" };
  }
  if (tone === "danger") {
    return {
      ...base,
      background: "transparent",
      border: "1.5px solid rgba(181,50,65,.55)",
      color: "#e0707d",
    };
  }
  return {
    ...base,
    background: "transparent",
    border: "1.5px solid rgba(244,241,234,.18)",
    color: "#f4f1ea",
  };
}
