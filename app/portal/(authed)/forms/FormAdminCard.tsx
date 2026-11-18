"use client";

import Link from "next/link";
import { useToast } from "../Toaster";

export type FormListItem = {
  id: string;
  slug: string;
  title: string;
  open: boolean;
  createdLabel: string;
  submissionCount: number;
  notifyEmails: string[];
};

export function formLink(slug: string): string {
  return `${window.location.origin}/f/${slug}`;
}

export function StatusPill({ open }: { open: boolean }) {
  return (
    <span
      style={{
        fontSize: "10.5px",
        fontWeight: 800,
        letterSpacing: "0.09em",
        textTransform: "uppercase",
        padding: "4px 9px",
        borderRadius: "999px",
        background: open ? "rgba(78,184,107,.12)" : "rgba(244,241,234,.07)",
        border: `1px solid ${open ? "rgba(78,184,107,.45)" : "rgba(244,241,234,.18)"}`,
        color: open ? "#7ed996" : "#9aa3b8",
      }}
    >
      {open ? "Open" : "Closed"}
    </span>
  );
}

export function CopyLinkButton({ slug, subtle = false }: { slug: string; subtle?: boolean }) {
  const { toast } = useToast();
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(formLink(slug));
          toast("Link copied — send it to anyone.", "success");
        } catch {
          toast(`Couldn't copy automatically — the link is ${formLink(slug)}`, "info");
        }
      }}
      style={{
        background: subtle ? "transparent" : "rgba(231,184,78,.1)",
        color: "#e7b84e",
        border: "1px solid rgba(231,184,78,.35)",
        borderRadius: "9px",
        padding: "9px 13px",
        fontSize: "12px",
        fontWeight: 800,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        cursor: "pointer",
      }}
    >
      Copy link
    </button>
  );
}

export function FormAdminCard({ item }: { item: FormListItem }) {
  return (
    <div
      style={{
        background: "#0e1526",
        border: "1px solid rgba(244,241,234,.1)",
        borderRadius: "13px",
        padding: "16px",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <h2 style={{ fontSize: "16.5px", fontWeight: 800, margin: 0, marginRight: "auto" }}>
          {item.title}
        </h2>
        <StatusPill open={item.open} />
      </div>
      <p style={{ color: "#9aa3b8", fontSize: "12.5px", fontWeight: 600, margin: "7px 0 0" }}>
        Created {item.createdLabel} · {item.submissionCount}{" "}
        {item.submissionCount === 1 ? "response" : "responses"} · sends to{" "}
        {item.notifyEmails.join(", ") || "no one"}
      </p>
      <div style={{ display: "flex", gap: "9px", marginTop: "13px", flexWrap: "wrap" }}>
        <CopyLinkButton slug={item.slug} />
        <Link
          href={`/portal/forms/${item.id}`}
          style={{
            background: "transparent",
            color: "#cdd3e0",
            border: "1px solid rgba(244,241,234,.16)",
            borderRadius: "9px",
            padding: "9px 13px",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
            textDecoration: "none",
          }}
        >
          View responses
        </Link>
      </div>
    </div>
  );
}
