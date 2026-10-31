"use client";

/**
 * "Did you mean …?" prompt for a probably-mistyped email domain.
 *
 * Shared by the signup and password-reset forms, which both stop short of
 * acting when lib/email-typos.ts finds a likely correction. Accepting is one
 * tap; insisting on the typed address is also one tap, because the guard is a
 * suggestion and members sign up with any domain.
 */
export function EmailSuggestion({
  suggestion,
  pending,
  onAccept,
  onKeep,
}: {
  suggestion: string;
  pending: boolean;
  /** Retry with the corrected address. */
  onAccept: () => void;
  /** Retry with what they typed, suppressing the prompt. */
  onKeep: () => void;
}) {
  const button: React.CSSProperties = {
    flex: "1 1 auto",
    minHeight: "44px",
    padding: "0 16px",
    fontSize: "13.5px",
    borderRadius: "10px",
    cursor: pending ? "wait" : "pointer",
  };

  return (
    <div
      style={{
        padding: "14px 15px",
        borderRadius: "12px",
        background: "rgba(231,184,78,.08)",
        border: "1px solid rgba(231,184,78,.3)",
        marginBottom: "14px",
        display: "flex",
        flexDirection: "column",
        gap: "11px",
      }}
    >
      <div style={{ fontSize: "13.5px", fontWeight: 700, color: "#cdd3e0", lineHeight: 1.5 }}>
        Did you mean{" "}
        <strong style={{ color: "#f4f1ea", wordBreak: "break-all" }}>{suggestion}</strong>?
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        <button
          type="button"
          disabled={pending}
          onClick={onAccept}
          style={{
            ...button,
            background: "#e7b84e",
            color: "#0b101c",
            fontWeight: 800,
            border: "none",
          }}
        >
          Use this address
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={onKeep}
          style={{
            ...button,
            background: "transparent",
            color: "#cdd3e0",
            fontWeight: 700,
            border: "1.5px solid rgba(244,241,234,.18)",
          }}
        >
          No, use what I typed
        </button>
      </div>
    </div>
  );
}
