"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { SignupField } from "../../../../lib/event-signup-forms";
import { validateFormFieldConfig } from "../../../../lib/standalone-forms";
import { useToast } from "../Toaster";
import { FieldsEditor } from "./FieldsEditor";
import { createForm } from "./actions";

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 13px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "10px",
  fontSize: "14px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#cdd3e0",
  marginBottom: "6px",
};

export function CreateFormCard() {
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState("");
  const [intro, setIntro] = useState("");
  const [fields, setFields] = useState<SignupField[]>([]);
  const [notifyEmails, setNotifyEmails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const { toast } = useToast();

  function reset() {
    setTitle("");
    setIntro("");
    setFields([]);
    setNotifyEmails("");
    setError(null);
  }

  function onSave() {
    if (!title.trim()) {
      setError("Give the form a title.");
      return;
    }
    const configProblem = validateFormFieldConfig(fields);
    if (configProblem) {
      setError(configProblem);
      return;
    }
    if (!notifyEmails.trim()) {
      setError("Add at least one email address to send responses to.");
      return;
    }
    setError(null);
    startTransition(async () => {
      const r = await createForm({ title, intro, fields, notifyEmailsRaw: notifyEmails });
      if (r.ok) {
        reset();
        setEditing(false);
        toast("Form created — copy its link from the card below.", "success");
        router.refresh();
      } else {
        setError(r.error);
      }
    });
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        style={{
          width: "100%",
          background: "transparent",
          color: "#e7b84e",
          border: "1.5px dashed rgba(231,184,78,.4)",
          borderRadius: "13px",
          padding: "16px",
          fontSize: "13.5px",
          fontWeight: 800,
          letterSpacing: "0.05em",
          textTransform: "uppercase",
          cursor: "pointer",
        }}
      >
        + New form
      </button>
    );
  }

  return (
    <div
      style={{
        background: "#0e1526",
        border: "1px solid rgba(231,184,78,.25)",
        borderRadius: "13px",
        padding: "16px",
      }}
    >
      <label style={labelStyle}>Title</label>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder='e.g. "Shirt Sizes"'
        style={{ ...inputStyle, marginBottom: "14px" }}
      />

      <label style={labelStyle}>
        Intro <span style={{ color: "#9aa3b8", fontWeight: 600 }}>(optional, shown above the questions)</span>
      </label>
      <textarea
        value={intro}
        onChange={(e) => setIntro(e.target.value)}
        rows={2}
        placeholder="A sentence about what this is for."
        style={{ ...inputStyle, marginBottom: "14px", resize: "vertical" }}
      />

      <label style={labelStyle}>Questions</label>
      <FieldsEditor fields={fields} onChange={setFields} />

      <label style={{ ...labelStyle, marginTop: "16px" }}>Send responses to</label>
      <textarea
        value={notifyEmails}
        onChange={(e) => setNotifyEmails(e.target.value)}
        rows={2}
        placeholder={"one email per line"}
        style={{ ...inputStyle, resize: "vertical" }}
      />

      {error && (
        <div style={{ color: "#ff8a8a", fontSize: "13px", fontWeight: 700, marginTop: "12px" }}>
          {error}
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
        <button
          type="button"
          onClick={onSave}
          disabled={pending}
          style={{
            flex: 1,
            background: "#e7b84e",
            color: "#0b101c",
            fontWeight: 800,
            fontSize: "13px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "13px",
            borderRadius: "11px",
            border: "none",
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Creating…" : "Create form"}
        </button>
        <button
          type="button"
          onClick={() => {
            reset();
            setEditing(false);
          }}
          disabled={pending}
          style={{
            background: "transparent",
            color: "#9aa3b8",
            border: "1px solid rgba(244,241,234,.14)",
            borderRadius: "11px",
            padding: "13px 18px",
            fontSize: "13px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
