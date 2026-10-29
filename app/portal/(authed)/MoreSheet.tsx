"use client";

import Link from "next/link";
import { BottomSheet, sheetHeading } from "./BottomSheet";
import type { NavItem } from "./admin-nav";

/** The sections that didn't fit in the bottom tab bar. */
export function MoreSheet({
  items,
  activeHref,
  onClose,
}: {
  items: NavItem[];
  activeHref: string | null;
  onClose: () => void;
}) {
  return (
    <BottomSheet label="More sections" onClose={onClose}>
      <h2 style={{ ...sheetHeading, margin: "0 4px 12px" }}>More</h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {items.map((item) => {
          const on = activeHref === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              aria-current={on ? "page" : undefined}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                minHeight: "64px",
                padding: "10px 12px",
                borderRadius: "14px",
                border: on ? "1.5px solid #e7b84e" : "1px solid rgba(244,241,234,.08)",
                background: on ? "rgba(231,184,78,.1)" : "transparent",
                color: "#f4f1ea",
                textDecoration: "none",
              }}
            >
              <span
                style={{
                  width: "42px",
                  height: "42px",
                  borderRadius: "11px",
                  background: "#1a2438",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#e7b84e",
                  flexShrink: 0,
                }}
              >
                {item.icon}
              </span>
              <span style={{ flex: 1, textAlign: "left", fontWeight: 800, fontSize: "16.5px" }}>
                {item.label}
              </span>
              {item.badgeCompact ?? item.badge ?? null}
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path
                  d="M9 6l6 6-6 6"
                  stroke="#e7b84e"
                  strokeWidth="2.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </Link>
          );
        })}
      </div>
    </BottomSheet>
  );
}
