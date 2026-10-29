"use client";

import Link from "next/link";
import type { NavItem } from "./admin-nav";
import { TAB_LABEL } from "./admin-nav";

function tabStyle(on: boolean) {
  return {
    position: "relative" as const,
    minHeight: "60px",
    border: "none",
    borderRadius: "12px",
    background: on ? "rgba(231,184,78,.14)" : "transparent",
    color: on ? "#e7b84e" : "#9aa3b8",
    cursor: "pointer",
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: "5px",
    padding: "4px 2px",
    textDecoration: "none",
  };
}

const labelStyle = {
  fontSize: "11.5px",
  fontWeight: 800,
  lineHeight: 1.1,
  whiteSpace: "nowrap" as const,
  overflow: "hidden",
  textOverflow: "ellipsis",
  maxWidth: "100%",
};

function badgeWrap(node: React.ReactNode) {
  if (!node || (Array.isArray(node) && node.length === 0)) return null;
  return (
    <span
      style={{
        position: "absolute",
        top: "4px",
        left: "calc(50% + 6px)",
        display: "flex",
        gap: "2px",
      }}
    >
      {node}
    </span>
  );
}

/**
 * Fixed bottom navigation for phones and tablets. Shows the sections this
 * person picked plus a More tab for the rest, so every sidebar destination
 * stays reachable below 960px.
 */
export function MobileTabBar({
  items,
  activeHref,
  moreActive,
  moreBadge,
  onMore,
}: {
  items: NavItem[];
  activeHref: string | null;
  /** True when the open page lives behind More, or the sheet itself is open. */
  moreActive: boolean;
  moreBadge?: React.ReactNode;
  /** Omitted when every section already fits in the bar. */
  onMore?: () => void;
}) {
  const showMore = typeof onMore === "function";
  const columns = items.length + (showMore ? 1 : 0);

  return (
    <nav
      aria-label="Portal sections"
      className="psh-mobile-block"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: "#121a2e",
        borderTop: "1px solid rgba(244,241,234,.1)",
        padding: "6px 6px calc(6px + env(safe-area-inset-bottom))",
        boxShadow: "0 -10px 30px -12px rgba(0,0,0,.5)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: "2px",
          maxWidth: "640px",
          margin: "0 auto",
        }}
      >
        {items.map((item) => {
          const on = activeHref === item.href && !moreActive;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={on ? "page" : undefined}
              style={tabStyle(on)}
            >
              <span style={{ display: "flex", width: 24, height: 24 }}>{item.icon}</span>
              {badgeWrap(item.badgeCompact ?? item.badge)}
              <span style={labelStyle}>{TAB_LABEL[item.href] ?? item.label}</span>
            </Link>
          );
        })}
        {showMore && (
          <button
            type="button"
            onClick={onMore}
            aria-expanded={moreActive}
            style={tabStyle(moreActive)}
          >
            <span style={{ display: "flex", width: 24, height: 24 }}>
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              >
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            </span>
            {badgeWrap(moreBadge)}
            <span style={labelStyle}>More</span>
          </button>
        )}
      </div>
    </nav>
  );
}
