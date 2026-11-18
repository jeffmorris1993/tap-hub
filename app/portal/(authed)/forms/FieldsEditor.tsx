"use client";

import {
  FIELD_TYPES,
  MAX_QUESTIONS,
  isChoiceType,
  newFieldId,
  type SignupField,
  type SignupFieldType,
} from "../../../../lib/event-signup-forms";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "9px",
  fontSize: "13.5px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
  colorScheme: "dark",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "10.5px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9aa3b8",
  marginBottom: "5px",
};

const smallBtnStyle: React.CSSProperties = {
  background: "transparent",
  color: "#9aa3b8",
  border: "1px solid rgba(244,241,234,.14)",
  borderRadius: "7px",
  padding: "5px 9px",
  fontSize: "12px",
  fontWeight: 800,
  cursor: "pointer",
};

/**
 * Flat question builder for standalone forms — same editing UX as the event
 * SignupQuestionsEditor, without the attendee/volunteer role split.
 */
export function FieldsEditor({
  fields,
  onChange,
}: {
  fields: SignupField[];
  onChange: (fields: SignupField[]) => void;
}) {
  function update(index: number, patch: Partial<SignupField>) {
    onChange(fields.map((f, i) => (i === index ? { ...f, ...patch } : f)));
  }
  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= fields.length) return;
    const next = [...fields];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }
  function add() {
    onChange([
      ...fields,
      {
        id: newFieldId("question", fields.map((f) => f.id)),
        label: "",
        type: "text",
        required: false,
      },
    ]);
  }

  return (
    <div>
      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {fields.map((field, index) => (
          <div
            key={field.id}
            style={{
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.1)",
              borderRadius: "11px",
              padding: "12px",
            }}
          >
            <div style={{ display: "flex", gap: "10px", alignItems: "flex-end", flexWrap: "wrap" }}>
              <div style={{ flex: "2 1 200px", minWidth: 0 }}>
                <label style={labelStyle}>Question</label>
                <input
                  value={field.label}
                  onChange={(e) => update(index, { label: e.target.value })}
                  placeholder='e.g. "T-shirt size"'
                  style={inputStyle}
                />
              </div>
              <div style={{ flex: "1 1 150px", minWidth: 0 }}>
                <label style={labelStyle}>Answer style</label>
                <select
                  value={field.type}
                  onChange={(e) => {
                    const type = e.target.value as SignupFieldType;
                    update(index, {
                      type,
                      options: isChoiceType(type) ? (field.options ?? []) : undefined,
                    });
                  }}
                  style={{ ...inputStyle, WebkitAppearance: "none", appearance: "none" }}
                >
                  {FIELD_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {isChoiceType(field.type) && (
              <div style={{ marginTop: "10px" }}>
                <label style={labelStyle}>Options (one per line)</label>
                <textarea
                  value={(field.options ?? []).join("\n")}
                  onChange={(e) => update(index, { options: e.target.value.split("\n") })}
                  rows={3}
                  placeholder={"S\nM\nL\nXL"}
                  style={{ ...inputStyle, resize: "vertical" }}
                />
              </div>
            )}
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginTop: "10px" }}>
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "7px",
                  color: "#cdd3e0",
                  fontSize: "12.5px",
                  marginRight: "auto",
                }}
              >
                <input
                  type="checkbox"
                  checked={field.required}
                  onChange={(e) => update(index, { required: e.target.checked })}
                  style={{ width: "15px", height: "15px", accentColor: "#e7b84e" }}
                />
                Required
              </label>
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} style={{ ...smallBtnStyle, opacity: index === 0 ? 0.4 : 1 }} aria-label="Move up">
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === fields.length - 1} style={{ ...smallBtnStyle, opacity: index === fields.length - 1 ? 0.4 : 1 }} aria-label="Move down">
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(fields.filter((_, i) => i !== index))}
                style={{ ...smallBtnStyle, color: "#ff8a8a", borderColor: "rgba(255,138,138,.3)" }}
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>
      {fields.length < MAX_QUESTIONS && (
        <button type="button" onClick={add} style={{ ...smallBtnStyle, marginTop: "10px", color: "#e7b84e", borderColor: "rgba(231,184,78,.35)" }}>
          + Add question
        </button>
      )}
    </div>
  );
}
