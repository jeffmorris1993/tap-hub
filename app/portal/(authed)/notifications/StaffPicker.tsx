"use client";

import { useMemo, useState } from "react";
import { ROLE_BADGE, staffDisplayName } from "../../../../lib/staff-display";
import { RoleTag } from "./Avatar";
import type { StaffProfile } from "./recipients";

/**
 * Checkbox list of staff accounts, with search and role filters.
 *
 * Search and filter state lives here rather than in the page's draft: it isn't
 * saved, and hoisting it would make the unsaved-changes check report a dirty
 * page for typing in a search box.
 */

type Filter = "all" | "pastoral" | "lead" | "selected";

/**
 * Below this many accounts the search box and filter pills are more chrome
 * than the list they filter, so they stay hidden. The page grows into the full
 * design as staff are added.
 */
const CHROME_THRESHOLD = 8;

export function StaffPicker({
  staff,
  selected,
  onToggle,
  onSetMany,
}: {
  staff: StaffProfile[];
  selected: string[];
  onToggle: (email: string) => void;
  /** Bulk add/remove, so one click is one state update rather than N. */
  onSetMany: (emails: string[], on: boolean) => void;
}) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const showChrome = staff.length > CHROME_THRESHOLD;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    return staff.filter((p) => {
      if (filter === "selected" && !selected.includes(p.email)) return false;
      if ((filter === "pastoral" || filter === "lead") && p.role !== filter) return false;
      if (!q) return true;
      return `${p.full_name ?? ""} ${p.email}`.toLowerCase().includes(q);
    });
  }, [staff, selected, filter, query]);

  const allShownSelected =
    results.length > 0 && results.every((p) => selected.includes(p.email));
  const showBulk = results.length > 1 && filter !== "selected";

  const counts = {
    all: staff.length,
    pastoral: staff.filter((p) => p.role === "pastoral").length,
    lead: staff.filter((p) => p.role === "lead").length,
    selected: selected.length,
  };

  const filters: { key: Filter; label: string }[] = [
    { key: "all", label: `All (${counts.all})` },
    { key: "pastoral", label: `Pastoral (${counts.pastoral})` },
    { key: "lead", label: `Ministry Leads (${counts.lead})` },
    { key: "selected", label: `Selected (${counts.selected})` },
  ];

  return (
    <div
      style={{
        border: "1px solid rgba(244,241,234,.12)",
        borderRadius: "14px",
        background: "#0b101c",
        overflow: "hidden",
      }}
    >
      {showChrome && (
        <>
          <div
            className="p-searchrow"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              padding: "0 14px",
              borderBottom: "1px solid rgba(244,241,234,.08)",
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{ flexShrink: 0 }}>
              <circle cx="11" cy="11" r="7" stroke="#7e889e" strokeWidth="2" />
              <path d="M20 20l-4-4" stroke="#7e889e" strokeWidth="2" strokeLinecap="round" />
            </svg>
            <input
              aria-label="Search staff"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${staff.length} staff by name or email`}
              style={{
                flex: 1,
                minWidth: 0,
                minHeight: "52px",
                border: "none",
                background: "transparent",
                color: "#f4f1ea",
                fontSize: "16px",
                outline: "none",
              }}
            />
            {query !== "" && (
              <button
                type="button"
                onClick={() => setQuery("")}
                style={{
                  minHeight: "40px",
                  padding: "0 10px",
                  border: "none",
                  background: "transparent",
                  color: "#aab3c5",
                  fontWeight: 700,
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                Clear
              </button>
            )}
          </div>
          <div
            role="radiogroup"
            aria-label="Filter by role"
            style={{
              display: "flex",
              gap: "8px",
              flexWrap: "wrap",
              padding: "10px 14px",
              borderBottom: "1px solid rgba(244,241,234,.08)",
            }}
          >
            {filters.map((f) => {
              const on = filter === f.key;
              return (
                <button
                  key={f.key}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setFilter(f.key)}
                  style={{
                    minHeight: "40px",
                    padding: "0 14px",
                    borderRadius: "999px",
                    fontWeight: 700,
                    fontSize: "14px",
                    cursor: "pointer",
                    border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.18)"}`,
                    background: on ? "#e7b84e" : "transparent",
                    color: on ? "#0b101c" : "#cdd3e0",
                  }}
                >
                  {f.label}
                </button>
              );
            })}
          </div>
        </>
      )}

      <div style={{ maxHeight: "288px", overflowY: "auto" }}>
        {results.map((p, i) => {
          const on = selected.includes(p.email);
          const badge = ROLE_BADGE[p.role];
          const name = staffDisplayName(p.full_name, p.email);
          return (
            <button
              key={p.id}
              type="button"
              role="checkbox"
              aria-checked={on}
              onClick={() => onToggle(p.email)}
              className="p-pickrow"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                width: "100%",
                minHeight: "60px",
                padding: "8px 14px",
                border: "none",
                borderBottom:
                  i === results.length - 1 ? "none" : "1px solid rgba(244,241,234,.06)",
                color: "#f4f1ea",
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  width: "26px",
                  height: "26px",
                  borderRadius: "7px",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 900,
                  fontSize: "15px",
                  ...(on
                    ? { background: "#e7b84e", color: "#0b101c" }
                    : { border: "2px solid #7e889e" }),
                }}
              >
                {on ? "✓" : ""}
              </span>
              <span
                style={{
                  flex: 1,
                  minWidth: 0,
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "15px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {name}
                </span>
                <span
                  style={{
                    color: "#aab3c5",
                    fontSize: "13px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {p.full_name?.trim() ? p.email : "No name on account"}
                </span>
              </span>
              <RoleTag label={badge.longLabel} bg={badge.bg} color={badge.color} />
            </button>
          );
        })}

        {results.length === 0 && (
          <div style={{ padding: "18px 14px", color: "#aab3c5", fontSize: "15px" }}>
            {query.trim()
              ? `No staff match "${query.trim()}". To email someone without an account, add them below.`
              : "No staff match this filter."}
          </div>
        )}
      </div>

      {showBulk && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            gap: "10px",
            flexWrap: "wrap",
            padding: "8px 14px",
            borderTop: "1px solid rgba(244,241,234,.08)",
            background: "#0d1424",
          }}
        >
          <span style={{ color: "#aab3c5", fontSize: "14px", fontWeight: 600 }}>
            Showing {results.length}
          </span>
          <button
            type="button"
            className="p-linkbtn"
            onClick={() =>
              onSetMany(
                results.map((p) => p.email),
                !allShownSelected,
              )
            }
            style={{ minHeight: "44px", padding: "0 12px", fontWeight: 800, fontSize: "14px" }}
          >
            {allShownSelected
              ? `Remove these ${results.length}`
              : `Select all ${results.length}`}
          </button>
        </div>
      )}
    </div>
  );
}
