"use client";

import { useEffect, type ReactNode } from "react";

type Props = {
  open: boolean;
  title: string;
  body?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Red Confirm button (delete-style) when true. Default false uses gold. */
  danger?: boolean;
  /** Disable the buttons while the parent's transition is pending. */
  pending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  pending = false,
  onConfirm,
  onCancel,
}: Props) {
  // Lock background scroll while the dialog is open + close on Escape.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !pending) onCancel();
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener("keydown", onKey);
    };
  }, [open, pending, onCancel]);

  if (!open) return null;

  const confirmBg = danger ? "#b53241" : "#e7b84e";
  const confirmFg = danger ? "#ffe5e7" : "#0b101c";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !pending) onCancel();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.65)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        zIndex: 100,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
        animation: "tap-confirm-fade .14s ease-out",
      }}
    >
      <div
        style={{
          background: "#121a2e",
          border: "1px solid rgba(244,241,234,.1)",
          borderRadius: "16px",
          padding: "26px 26px 22px",
          maxWidth: "440px",
          width: "100%",
          boxShadow: "0 24px 70px rgba(0,0,0,.6)",
          animation: "tap-confirm-up .18s ease-out",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "13px",
            marginBottom: body ? "14px" : "20px",
          }}
        >
          <span
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "11px",
              background: danger ? "rgba(181,50,65,.18)" : "rgba(231,184,78,.16)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
            aria-hidden
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke={danger ? "#ff8a8a" : "#e7b84e"}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              {danger ? (
                <>
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M5 6l1 14a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-14" />
                  <path d="M10 11v6M14 11v6" />
                </>
              ) : (
                <>
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 8v4M12 16h0" />
                </>
              )}
            </svg>
          </span>
          <h2
            id="confirm-dialog-title"
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "20px",
              lineHeight: 1.05,
              color: "#f4f1ea",
            }}
          >
            {title}
          </h2>
        </div>

        {body && (
          <p
            style={{
              color: "#cdd3e0",
              fontSize: "14px",
              fontWeight: 500,
              lineHeight: 1.55,
              marginBottom: "22px",
            }}
          >
            {body}
          </p>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            disabled={pending}
            style={{
              background: "transparent",
              border: "1px solid rgba(244,241,234,.18)",
              color: "#cdd3e0",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "11px 20px",
              borderRadius: "10px",
              cursor: pending ? "not-allowed" : "pointer",
              opacity: pending ? 0.5 : 1,
            }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={pending}
            autoFocus
            style={{
              background: confirmBg,
              color: confirmFg,
              border: "none",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "11px 22px",
              borderRadius: "10px",
              cursor: pending ? "wait" : "pointer",
              opacity: pending ? 0.7 : 1,
              boxShadow: danger
                ? "0 8px 20px -8px rgba(181,50,65,.55)"
                : "0 8px 20px -8px rgba(231,184,78,.55)",
            }}
          >
            {pending ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes tap-confirm-fade {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes tap-confirm-up {
          from { opacity: 0; transform: translateY(8px) scale(.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
