"use client";

import { useState } from "react";
import { EMAIL_RE } from "../../../../lib/email-typos";
import type { StaffProfile } from "./recipients";

/**
 * Addresses for people without a portal account — a deacon, a shared inbox.
 *
 * The half-typed address and its error live here, not in the page's draft:
 * neither is saved, and keeping them out means typing doesn't mark the page
 * dirty.
 */
export function ExtraEmails({
  inputId,
  value,
  staff,
  onChange,
  onSelectStaff,
}: {
  inputId: string;
  value: string[];
  staff: StaffProfile[];
  onChange: (next: string[]) => void;
  /**
   * Staff addresses check their rows instead of becoming chips. Batched,
   * because a comma-separated paste can name several at once and one call per
   * address would each read the same stale selection.
   */
  onSelectStaff: (emails: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [error, setError] = useState("");

  function commit() {
    const parts = input
      .split(/[,;\s]+/)
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean);
    if (parts.length === 0) return;

    const staffEmails = new Set(staff.map((p) => p.email));
    const bad: string[] = [];
    const added: string[] = [];
    const matchedStaff: string[] = [];

    for (const part of parts) {
      if (!EMAIL_RE.test(part)) {
        bad.push(part);
        continue;
      }
      // Typing a staff member's address selects them rather than creating a
      // second chip — the server dedupes on save, which would otherwise make
      // the chip silently disappear.
      if (staffEmails.has(part)) {
        if (!matchedStaff.includes(part)) matchedStaff.push(part);
        continue;
      }
      if (!value.includes(part) && !added.includes(part)) added.push(part);
    }

    if (matchedStaff.length > 0) onSelectStaff(matchedStaff);
    if (added.length > 0) onChange([...value, ...added]);
    // Invalid entries stay in the field so they can be corrected in place.
    setInput(bad.join(", "));
    setError(bad.length > 0 ? `"${bad.join(", ")}" doesn't look like an email address.` : "");
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      <label htmlFor={inputId} style={{ fontWeight: 800, fontSize: "16px", color: "#f4f1ea" }}>
        Other email addresses{" "}
        <span style={{ color: "#aab3c5", fontWeight: 500 }}>(optional)</span>
      </label>

      {value.length > 0 && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {value.map((email) => (
            <span
              key={email}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "4px",
                background: "#0b101c",
                border: "1px solid rgba(244,241,234,.18)",
                borderRadius: "999px",
                padding: "0 4px 0 14px",
                minHeight: "40px",
                fontWeight: 700,
                fontSize: "14px",
                maxWidth: "100%",
                color: "#f4f1ea",
              }}
            >
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{email}</span>
              <button
                type="button"
                className="p-iconbtn"
                aria-label={`Remove ${email}`}
                onClick={() => onChange(value.filter((e) => e !== email))}
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "50%",
                  border: "none",
                  fontSize: "18px",
                  cursor: "pointer",
                  flexShrink: 0,
                }}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        <input
          id={inputId}
          type="email"
          className="p-field"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setError("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              commit();
            }
          }}
          placeholder="name@example.org"
          style={{
            flex: "1 1 240px",
            minWidth: 0,
            minHeight: "52px",
            padding: "12px 16px",
            borderRadius: "12px",
            background: "#0b101c",
            color: "#f4f1ea",
            fontSize: "16px",
          }}
        />
        <button
          type="button"
          onClick={commit}
          style={{
            minHeight: "52px",
            padding: "0 20px",
            borderRadius: "12px",
            border: "2px solid #e7b84e",
            background: "transparent",
            color: "#e7b84e",
            fontWeight: 800,
            fontSize: "15px",
            cursor: "pointer",
          }}
        >
          Add
        </button>
      </div>

      {error !== "" && (
        <span role="alert" style={{ color: "#f08a96", fontWeight: 700, fontSize: "14px" }}>
          {error}
        </span>
      )}
      <span style={{ color: "#aab3c5", fontSize: "14px" }}>
        For people without a TapHub account, like a deacon or the care team inbox.
      </span>
    </div>
  );
}
