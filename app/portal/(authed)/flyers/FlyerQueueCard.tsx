"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { submitFlyerForApproval, uploadEventFlyer } from "../events/flyer-actions";
import { shrinkFlyer } from "../events/FlyerSection";
import { flyerPublicUrl } from "../../../../lib/flyers";
import { useToast } from "../Toaster";

export type FlyerQueueItem = {
  id: string;
  title: string;
  category: string;
  whenLabel: string;
  location: string;
  flyer_status: "awaiting_design" | "submitted" | "rejected";
  flyer_path: string | null;
  flyer_request_notes: string | null;
  flyer_notes: string | null;
  submitted_by: string | null;
  flyer_reviewed_by: string | null;
};

const STATUS_PILL: Record<FlyerQueueItem["flyer_status"], { bg: string; color: string; label: string }> = {
  awaiting_design: { bg: "rgba(231,184,78,.16)", color: "#e7b84e", label: "Awaiting design" },
  submitted: { bg: "rgba(121,168,238,.16)", color: "#9cc0f3", label: "In review" },
  rejected: { bg: "rgba(181,50,65,.16)", color: "#ff8a8a", label: "Changes requested" },
};

export function FlyerQueueCard({ item }: { item: FlyerQueueItem }) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const pill = STATUS_PILL[item.flyer_status];
  const url = item.flyer_path ? flyerPublicUrl(item.flyer_path) : null;

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    startTransition(async () => {
      const shrunk = await shrinkFlyer(file);
      const form = new FormData();
      form.set("eventId", item.id);
      form.set("file", shrunk);
      const r = await uploadEventFlyer(form);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Flyer uploaded — submit it when you're happy with it.", "success");
      router.refresh();
    });
  }

  function onSubmit() {
    startTransition(async () => {
      const r = await submitFlyerForApproval(item.id);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Sent to the pastors for approval.", "success");
      router.refresh();
    });
  }

  return (
    <div
      style={{
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "16px",
        padding: "18px",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "19px",
              lineHeight: 1.1,
            }}
          >
            {item.title}
          </div>
          <div style={{ color: "#9aa3b8", fontSize: "12.5px", fontWeight: 700, marginTop: "5px" }}>
            {item.whenLabel} · {item.location} · {item.category}
            {item.submitted_by ? ` · requested by ${item.submitted_by}` : ""}
          </div>
        </div>
        <span
          style={{
            fontSize: "10.5px",
            fontWeight: 800,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            padding: "5px 10px",
            borderRadius: "7px",
            background: pill.bg,
            color: pill.color,
            whiteSpace: "nowrap",
          }}
        >
          {pill.label}
        </span>
      </div>

      {item.flyer_request_notes && (
        <div
          style={{
            marginTop: "12px",
            borderLeft: "3px solid #e7b84e",
            background: "rgba(231,184,78,.06)",
            borderRadius: "0 10px 10px 0",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#f4f1ea",
            lineHeight: 1.5,
          }}
        >
          <span style={{ display: "block", color: "#e7b84e", fontWeight: 800, fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>
            Notes from the requester
          </span>
          {item.flyer_request_notes}
        </div>
      )}

      {item.flyer_status === "rejected" && item.flyer_notes && (
        <div
          style={{
            marginTop: "12px",
            borderLeft: "3px solid #ff8a8a",
            background: "rgba(181,50,65,.07)",
            borderRadius: "0 10px 10px 0",
            padding: "10px 14px",
            fontSize: "13px",
            color: "#f4f1ea",
            lineHeight: 1.5,
          }}
        >
          <span style={{ display: "block", color: "#ff8a8a", fontWeight: 800, fontSize: "10.5px", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "3px" }}>
            From {item.flyer_reviewed_by ?? "the reviewer"}
          </span>
          {item.flyer_notes}
        </div>
      )}

      <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", marginTop: "14px", flexWrap: "wrap" }}>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`${item.title} flyer`}
            style={{ width: "110px", borderRadius: "10px", border: "1px solid rgba(244,241,234,.14)", display: "block" }}
          />
        )}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={busy}
            style={{
              background: "#1a2438",
              color: "#cdd3e0",
              fontWeight: 800,
              fontSize: "12px",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              padding: "11px 18px",
              borderRadius: "9px",
              border: "1px solid rgba(244,241,234,.14)",
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {busy ? "Working…" : url ? (item.flyer_status === "rejected" ? "Upload revision" : "Replace flyer") : "Upload flyer"}
          </button>
          {url && item.flyer_status !== "submitted" && (
            <button
              type="button"
              onClick={onSubmit}
              disabled={busy}
              style={{
                background: "#e7b84e",
                color: "#0b101c",
                fontWeight: 800,
                fontSize: "12px",
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                padding: "11px 18px",
                borderRadius: "9px",
                border: "none",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              Submit for approval
            </button>
          )}
          <Link
            href={`/portal/events/${item.id}`}
            style={{
              color: "#9aa3b8",
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
              textDecoration: "none",
              padding: "4px 2px",
            }}
          >
            View full event →
          </Link>
        </div>
      </div>
      <input ref={fileRef} type="file" accept="image/*" onChange={onFileChosen} style={{ display: "none" }} />
    </div>
  );
}
