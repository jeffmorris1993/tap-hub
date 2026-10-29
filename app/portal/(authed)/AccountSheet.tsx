"use client";

import Link from "next/link";
import { BottomSheet, sheetButton } from "./BottomSheet";

type Persona = { name: string; email: string; role: string; initials: string };

/** Who you're signed in as, plus profile, tab-bar setup, and sign out. */
export function AccountSheet({
  persona,
  onClose,
  onCustomize,
  onSignOut,
  canCustomize,
}: {
  persona: Persona;
  onClose: () => void;
  onCustomize: () => void;
  onSignOut: () => void;
  /** False when every section already fits in the tab bar. */
  canCustomize: boolean;
}) {
  return (
    <BottomSheet label="Account" onClose={onClose}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <span
            style={{
              width: "56px",
              height: "56px",
              borderRadius: "50%",
              background: "#e7b84e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-anton)",
              fontSize: "20px",
              color: "#0b101c",
              flexShrink: 0,
            }}
          >
            {persona.initials}
          </span>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 800, fontSize: "18px", color: "#f4f1ea" }}>
              {persona.name}
            </div>
            <div style={{ fontSize: "14px", fontWeight: 700, color: "#e7b84e", marginTop: "2px" }}>
              {persona.role}
            </div>
            <div
              style={{
                fontSize: "13.5px",
                color: "#9aa3b8",
                fontWeight: 600,
                marginTop: "3px",
                overflowWrap: "anywhere",
              }}
            >
              {persona.email}
            </div>
          </div>
        </div>

        <Link href="/portal/profile" onClick={onClose} style={sheetButton("quiet")}>
          View profile
        </Link>
        {canCustomize && (
          <button type="button" onClick={onCustomize} style={sheetButton("quiet")}>
            Customize bottom menu
          </button>
        )}
        <button type="button" onClick={onSignOut} style={sheetButton("danger")}>
          Sign Out
        </button>
      </div>
    </BottomSheet>
  );
}
