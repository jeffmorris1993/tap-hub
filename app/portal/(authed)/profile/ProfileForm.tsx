"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "./actions";
import { useToast } from "../Toaster";

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.1em",
  textTransform: "uppercase",
  color: "#6a738b",
  marginBottom: "8px",
};

// 16px minimum keeps iOS from zooming the page when a field is focused.
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "#1a2438",
  border: "1px solid rgba(244,241,234,.1)",
  borderRadius: "11px",
  minHeight: "54px",
  padding: "0 14px",
  color: "#f4f1ea",
  fontSize: "16px",
  fontWeight: 600,
  fontFamily: "inherit",
};

const hintStyle: React.CSSProperties = {
  marginTop: "8px",
  fontSize: "12.5px",
  color: "#9aa3b8",
  fontWeight: 500,
  lineHeight: 1.45,
};

export function ProfileForm({
  initialName,
  initialPhone,
}: {
  initialName: string;
  initialPhone: string;
}) {
  const [name, setName] = useState(initialName);
  const [phone, setPhone] = useState(initialPhone);
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfile(fd);
      if (res.ok) toast("Profile saved.", "success");
      else toast(res.error ?? "Couldn't save your profile.", "error");
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      style={{
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "18px",
        padding: "24px",
        display: "flex",
        flexDirection: "column",
        gap: "18px",
      }}
    >
      <div>
        <label htmlFor="full_name" style={labelStyle}>
          Display name
        </label>
        <input
          id="full_name"
          name="full_name"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Pastor Jones"
          maxLength={80}
          autoComplete="name"
          style={inputStyle}
        />
        <p style={hintStyle}>
          Shown in the sidebar and on admin pages. Leave empty to fall back to your email.
        </p>
      </div>

      <div>
        <label htmlFor="phone" style={labelStyle}>
          Phone
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="(248) 555-0123"
          autoComplete="tel"
          style={inputStyle}
        />
        <p style={hintStyle}>So the rest of the team can reach you. Optional.</p>
      </div>

      <div>
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "#e7b84e",
            color: "#0b101c",
            border: "none",
            borderRadius: "12px",
            minHeight: "52px",
            padding: "0 26px",
            fontSize: "15px",
            fontWeight: 800,
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
