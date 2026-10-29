"use client";

import { useEffect, type ReactNode } from "react";

/**
 * Slide-up sheet on phones, centered modal from 960px up (see
 * portal-shell.css). Closes on backdrop click and Escape; locking body
 * scroll is the caller's job since several sheets can hand off to each
 * other.
 */
export function BottomSheet({
  label,
  onClose,
  children,
  zIndex,
}: {
  /** Accessible name for the dialog. */
  label: string;
  onClose: () => void;
  children: ReactNode;
  /** Raise above another open sheet (the customize sheet sits on top). */
  zIndex?: number;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="psh-scrim" style={zIndex ? { zIndex } : undefined} onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="psh-sheet"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="psh-grabber"
          aria-hidden="true"
          style={{
            width: "44px",
            height: "5px",
            borderRadius: "3px",
            background: "rgba(244,241,234,.25)",
            margin: "4px auto 14px",
          }}
        />
        {children}
      </div>
    </div>
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
