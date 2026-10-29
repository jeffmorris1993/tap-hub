"use client";

import { usePortalShell } from "../AdminShell";

/**
 * Opens the shell's bottom-menu editor. Mobile only — the bottom tab bar
 * doesn't exist on desktop, where the full sidebar is always visible.
 */
export function CustomizeMenuButton() {
  const shell = usePortalShell();
  if (!shell) return null;
  return (
    <button
      type="button"
      onClick={shell.openCustomize}
      className="psh-mobile-only"
      style={{
        minHeight: "48px",
        borderRadius: "12px",
        background: "transparent",
        border: "1.5px solid rgba(244,241,234,.18)",
        color: "#f4f1ea",
        fontWeight: 800,
        fontSize: "14.5px",
        cursor: "pointer",
        width: "100%",
        marginTop: "8px",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      Customize bottom menu
    </button>
  );
}
