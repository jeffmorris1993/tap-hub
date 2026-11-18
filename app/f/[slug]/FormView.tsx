"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { PhoneShell } from "../../../components/PhoneShell";
import { BackBar } from "../../../components/BackBar";
import {
  validateAnswers,
  type FieldErrors,
  type SignupAnswers,
  type SignupField,
} from "../../../lib/event-signup-forms";
import { submitStandaloneForm } from "./actions";

export type PublicForm = {
  id: string;
  title: string;
  intro: string | null;
  open: boolean;
  fields: SignupField[];
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px 15px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "11px",
  fontSize: "15px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
};

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#cdd3e0",
  marginBottom: "9px",
};

const fieldErrorStyle: React.CSSProperties = {
  color: "#ff8a8a",
  fontSize: "13px",
  fontWeight: 700,
  margin: "-6px 0 12px",
};

const choiceRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "11px",
  padding: "12px 14px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "11px",
  background: "#0b101c",
  color: "#f4f1ea",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

/** One question, rendered by type. Errors show inline below. */
function QuestionField({
  field,
  value,
  error,
  onChange,
}: {
  field: SignupField;
  value: string | string[] | undefined;
  error: string | undefined;
  onChange: (value: string | string[]) => void;
}) {
  const label = (
    <div style={fieldLabelStyle}>
      {field.label}
      {field.required && <span style={{ color: "#e7b84e", marginLeft: "4px" }}>*</span>}
    </div>
  );
  const errorLine = error ? <div style={fieldErrorStyle}>{error}</div> : null;

  if (field.type === "textarea") {
    return (
      <div>
        {label}
        <textarea
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value)}
          rows={3}
          style={{ ...inputStyle, marginBottom: "12px", resize: "vertical", minHeight: "78px" }}
        />
        {errorLine}
      </div>
    );
  }
  if (field.type === "select" || field.type === "checkboxes") {
    const multi = field.type === "checkboxes";
    const selected = multi
      ? new Set(Array.isArray(value) ? value : [])
      : new Set(typeof value === "string" && value ? [value] : []);
    return (
      <div>
        {label}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginBottom: "12px" }}>
          {(field.options ?? []).map((option) => {
            const on = selected.has(option);
            return (
              <label
                key={option}
                style={{
                  ...choiceRowStyle,
                  borderColor: on ? "#e7b84e" : "rgba(244,241,234,.14)",
                }}
              >
                <input
                  type={multi ? "checkbox" : "radio"}
                  name={field.id}
                  checked={on}
                  onChange={() => {
                    if (multi) {
                      const next = new Set(selected);
                      if (next.has(option)) next.delete(option);
                      else next.add(option);
                      onChange([...next]);
                    } else {
                      onChange(option);
                    }
                  }}
                  style={{ accentColor: "#e7b84e", width: "16px", height: "16px", flexShrink: 0 }}
                />
                {option}
              </label>
            );
          })}
        </div>
        {errorLine}
      </div>
    );
  }
  return (
    <div>
      {label}
      <input
        value={typeof value === "string" ? value : ""}
        onChange={(e) => onChange(e.target.value)}
        style={{ ...inputStyle, marginBottom: "12px" }}
      />
      {errorLine}
    </div>
  );
}

export function FormView({ form }: { form: PublicForm }) {
  const [answers, setAnswers] = useState<SignupAnswers>({});
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [pending, startTransition] = useTransition();

  function setAnswer(id: string, value: string | string[]) {
    setAnswers((cur) => ({ ...cur, [id]: value }));
    setFieldErrors((cur) => {
      if (!cur[id]) return cur;
      const next = { ...cur };
      delete next[id];
      return next;
    });
  }

  function onSubmit() {
    const errors = validateAnswers(form.fields, answers);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      setFormError("Check the highlighted answers below.");
      return;
    }
    setFormError(null);
    startTransition(async () => {
      const r = await submitStandaloneForm(form.id, answers);
      if (r.ok) {
        setDone(true);
      } else {
        setFormError(r.error);
        setFieldErrors(r.fieldErrors ?? {});
      }
    });
  }

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title={form.title} subtitle="Nehemiah's Temple" />

        {done ? (
          <div className="th-up" style={{ padding: "60px 26px", textAlign: "center" }}>
            <div
              style={{
                width: "80px",
                height: "80px",
                borderRadius: "50%",
                background: "#1a2438",
                border: "1px solid rgba(231,184,78,.35)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto",
              }}
            >
              <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            </div>
            <h3
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "30px",
                marginTop: "22px",
              }}
            >
              Got it — thank you!
            </h3>
            <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 500, lineHeight: 1.6, marginTop: "12px" }}>
              Your answers are in. You can close this page.
            </p>
            <Link
              href="/"
              style={{
                display: "inline-block",
                marginTop: "28px",
                background: "#1a2438",
                color: "#fff",
                border: "1px solid rgba(244,241,234,.14)",
                fontWeight: 800,
                fontSize: "13px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "15px 34px",
                borderRadius: "11px",
                textDecoration: "none",
              }}
            >
              Back to Hub
            </Link>
          </div>
        ) : !form.open ? (
          <div className="th-up" style={{ padding: "60px 26px", textAlign: "center" }}>
            <h3
              style={{
                fontFamily: "var(--font-anton)",
                fontWeight: 400,
                textTransform: "uppercase",
                fontSize: "28px",
              }}
            >
              This form is closed
            </h3>
            <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 500, lineHeight: 1.6, marginTop: "12px" }}>
              It&apos;s no longer taking responses. If you think that&apos;s a mistake, reach out
              to whoever sent you the link.
            </p>
          </div>
        ) : (
          <div style={{ padding: "20px 18px 40px" }}>
            {form.intro && (
              <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.55, marginBottom: "22px" }}>
                {form.intro}
              </p>
            )}

            {form.fields.map((field) => (
              <QuestionField
                key={field.id}
                field={field}
                value={answers[field.id]}
                error={fieldErrors[field.id]}
                onChange={(value) => setAnswer(field.id, value)}
              />
            ))}

            {formError && (
              <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, margin: "4px 0 12px" }}>
                {formError}
              </div>
            )}

            <button
              type="button"
              onClick={onSubmit}
              disabled={pending}
              style={{
                width: "100%",
                marginTop: "8px",
                background: "#e7b84e",
                color: "#0b101c",
                fontWeight: 800,
                fontSize: "14px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "17px",
                borderRadius: "12px",
                border: "none",
                cursor: pending ? "wait" : "pointer",
                opacity: pending ? 0.7 : 1,
              }}
            >
              {pending ? "Sending…" : "Submit"}
            </button>
          </div>
        )}
      </div>
    </PhoneShell>
  );
}
