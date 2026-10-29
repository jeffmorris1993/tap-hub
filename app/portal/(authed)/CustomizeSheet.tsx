"use client";

import { BottomSheet, sheetButton, sheetHeading } from "./BottomSheet";
import type { NavItem } from "./admin-nav";

function squareButton(disabled: boolean) {
  return {
    width: "48px",
    height: "48px",
    borderRadius: "12px",
    background: "#1a2438",
    border: "1px solid rgba(244,241,234,.12)",
    color: "#f4f1ea",
    fontSize: "18px",
    fontWeight: 800,
    cursor: disabled ? "default" : "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
    opacity: disabled ? 0.35 : 1,
  };
}

const iconTile = {
  width: "40px",
  height: "40px",
  borderRadius: "10px",
  background: "#1a2438",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#e7b84e",
  flexShrink: 0,
};

const rowLabel = {
  flex: 1,
  minWidth: 0,
  fontWeight: 800,
  fontSize: "16px",
  color: "#f4f1ea",
};

/** Pick and order the sections in the bottom tab bar. */
export function CustomizeSheet({
  nav,
  tabs,
  max,
  home,
  onSave,
  onReset,
  onClose,
}: {
  nav: NavItem[];
  tabs: string[];
  max: number;
  home: string;
  onSave: (next: string[]) => void;
  onReset: () => void;
  onClose: () => void;
}) {
  const byHref = new Map(nav.map((n) => [n.href, n]));
  const chosen = tabs.map((href) => byHref.get(href)).filter((n): n is NavItem => Boolean(n));
  const rest = nav.filter((n) => !tabs.includes(n.href));
  const full = tabs.length >= max;

  function move(index: number, delta: number) {
    const next = [...tabs];
    const target = index + delta;
    // Index 0 is Overview and stays pinned, so nothing may swap into it.
    if (target < 1 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onSave(next);
  }

  return (
    <BottomSheet label="Customize bottom menu" onClose={onClose} zIndex={92}>
      <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
          <h2 style={sheetHeading}>Your bottom menu</h2>
          <p style={{ color: "#9aa3b8", fontSize: "15.5px", fontWeight: 600, lineHeight: 1.5 }}>
            Pick the {max} sections you use most. Everything else stays under More. Overview always
            stays first.
          </p>
        </div>

        <span
          style={{
            fontSize: "12.5px",
            fontWeight: 800,
            letterSpacing: ".07em",
            textTransform: "uppercase",
            color: "#e7b84e",
          }}
        >
          In your menu · {tabs.length} of {max}
        </span>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {chosen.map((item, i) => {
            const pinned = item.href === home;
            return (
              <div
                key={item.href}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  minHeight: "64px",
                  padding: "8px 10px",
                  borderRadius: "14px",
                  border: "1.5px solid rgba(231,184,78,.45)",
                  background: "rgba(231,184,78,.08)",
                }}
              >
                <span
                  style={{
                    width: "28px",
                    fontFamily: "var(--font-anton)",
                    fontSize: "18px",
                    color: "#e7b84e",
                    textAlign: "center",
                    flexShrink: 0,
                  }}
                >
                  {i + 1}
                </span>
                <span style={iconTile}>{item.icon}</span>
                <span style={rowLabel}>{item.label}</span>
                {pinned ? (
                  <span
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: "#9aa3b8",
                      paddingRight: "6px",
                    }}
                  >
                    Always first
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i <= 1}
                      aria-label={`Move ${item.label} up`}
                      style={squareButton(i <= 1)}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i >= chosen.length - 1}
                      aria-label={`Move ${item.label} down`}
                      style={squareButton(i >= chosen.length - 1)}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => onSave(tabs.filter((h) => h !== item.href))}
                      aria-label={`Remove ${item.label}`}
                      style={{ ...squareButton(false), color: "#e0707d" }}
                    >
                      ✕
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>

        {rest.length > 0 && (
          <>
            <span
              style={{
                fontSize: "12.5px",
                fontWeight: 800,
                letterSpacing: ".07em",
                textTransform: "uppercase",
                color: "#9aa3b8",
                marginTop: "4px",
              }}
            >
              Other sections
            </span>
            {full && (
              <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 600, lineHeight: 1.45 }}>
                Your menu is full. Remove one above to add another.
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {rest.map((item) => (
                <div
                  key={item.href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    minHeight: "64px",
                    padding: "8px 10px",
                    borderRadius: "14px",
                    border: "1px solid rgba(244,241,234,.1)",
                  }}
                >
                  <span style={iconTile}>{item.icon}</span>
                  <span style={rowLabel}>{item.label}</span>
                  <button
                    type="button"
                    onClick={() => onSave([...tabs, item.href])}
                    disabled={full}
                    style={{
                      minHeight: "48px",
                      padding: "0 18px",
                      borderRadius: "12px",
                      border: "none",
                      background: full ? "#1a2438" : "#e7b84e",
                      color: full ? "#9aa3b8" : "#0b101c",
                      fontWeight: 800,
                      fontSize: "15px",
                      cursor: full ? "default" : "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Add
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1.4fr",
            gap: "10px",
            marginTop: "6px",
          }}
        >
          <button type="button" onClick={onReset} style={sheetButton("quiet")}>
            Reset
          </button>
          <button type="button" onClick={onClose} style={sheetButton("gold")}>
            Done
          </button>
        </div>
      </div>
    </BottomSheet>
  );
}
