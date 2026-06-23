"use client";

import { useState, useTransition } from "react";
import { updateProfile } from "./actions";

export function ProfileForm({ initialName }: { initialName: string }) {
  const [name, setName] = useState(initialName);
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const res = await updateProfile(fd);
      if (res.ok) setStatus({ ok: true, msg: "Saved." });
      else setStatus({ ok: false, msg: res.error ?? "Couldn't save your name." });
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
        maxWidth: "520px",
      }}
    >
      <label
        htmlFor="full_name"
        style={{
          display: "block",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: "#6a738b",
          marginBottom: "8px",
        }}
      >
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
        style={{
          width: "100%",
          background: "#1a2438",
          border: "1px solid rgba(244,241,234,.1)",
          borderRadius: "11px",
          padding: "12px 14px",
          color: "#f4f1ea",
          fontSize: "15px",
          fontWeight: 600,
          fontFamily: "inherit",
        }}
      />
      <p style={{ marginTop: "10px", fontSize: "12.5px", color: "#9aa3b8", fontWeight: 500 }}>
        Shown in the sidebar and on admin pages. Leave empty to fall back to your email.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "14px", marginTop: "20px" }}>
        <button
          type="submit"
          disabled={pending}
          style={{
            background: "#e7b84e",
            color: "#0b101c",
            border: "none",
            borderRadius: "11px",
            padding: "12px 22px",
            fontSize: "13.5px",
            fontWeight: 800,
            cursor: pending ? "wait" : "pointer",
            opacity: pending ? 0.7 : 1,
          }}
        >
          {pending ? "Saving…" : "Save"}
        </button>
        {status ? (
          <span
            style={{
              fontSize: "13px",
              fontWeight: 700,
              color: status.ok ? "#7ed996" : "#ef6f6f",
            }}
          >
            {status.msg}
          </span>
        ) : null}
      </div>
    </form>
  );
}
