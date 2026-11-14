"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  approveEventFlyer,
  rejectEventFlyer,
  removeEventFlyer,
  submitFlyerForApproval,
  uploadEventFlyer,
} from "./flyer-actions";
import { flyerPublicUrl, FLYER_STATUS_LABELS, type FlyerMode, type FlyerStatus } from "../../../../lib/flyers";
import { useToast } from "../Toaster";

/**
 * The "Flyer" step of the event form: pick upload-vs-request, manage the
 * uploaded file, and (for pastoral viewers) review a submitted flyer.
 * Uploads talk to their own FormData actions immediately — the file never
 * rides the JSON save payload.
 */

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#9aa3b8",
  marginBottom: "6px",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: "1.5px solid rgba(244,241,234,.14)",
  borderRadius: "10px",
  fontSize: "14.5px",
  color: "#f4f1ea",
  background: "#0b101c",
  outline: "none",
  fontFamily: "inherit",
};

/** Downscale in the browser so uploads stay snappy on church Wi-Fi (same
 *  trick as the feedback form, tuned for flyers: longer edge, higher
 *  quality). Falls back to the original file for formats the canvas can't
 *  decode. */
export async function shrinkFlyer(file: File): Promise<File> {
  const MAX_EDGE = 2000;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size < 1.5 * 1024 * 1024) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.[^.]+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export type FlyerSectionState = {
  flyer_status?: FlyerStatus;
  flyer_path?: string | null;
  flyer_notes?: string | null;
  flyer_uploaded_by?: string | null;
};

export function FlyerSection({
  eventId,
  eventApproved,
  canApprove,
  disabled,
  mode,
  onModeChange,
  requestNotes,
  onRequestNotesChange,
  flyer,
}: {
  eventId?: string;
  eventApproved: boolean;
  canApprove: boolean;
  disabled?: boolean;
  mode: FlyerMode;
  onModeChange: (m: FlyerMode) => void;
  requestNotes: string;
  onRequestNotesChange: (v: string) => void;
  flyer: FlyerSectionState;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, startTransition] = useTransition();
  const fileRef = useRef<HTMLInputElement>(null);
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [rejectNotes, setRejectNotes] = useState("");
  const [routeToDesigner, setRouteToDesigner] = useState(false);

  const status: FlyerStatus = flyer.flyer_status ?? "none";
  const path = flyer.flyer_path ?? null;
  const url = path ? flyerPublicUrl(path) : null;

  function pickFile() {
    fileRef.current?.click();
  }

  function onFileChosen(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !eventId) return;
    startTransition(async () => {
      const shrunk = await shrinkFlyer(file);
      const form = new FormData();
      form.set("eventId", eventId);
      form.set("file", shrunk);
      const r = await uploadEventFlyer(form);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Flyer uploaded.", "success");
      router.refresh();
    });
  }

  function onSubmitFlyer() {
    if (!eventId) return;
    startTransition(async () => {
      const r = await submitFlyerForApproval(eventId);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Flyer submitted for approval.", "success");
      router.refresh();
    });
  }

  function onRemove() {
    if (!eventId) return;
    startTransition(async () => {
      const r = await removeEventFlyer(eventId);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Flyer removed.", "success");
      onModeChange("none");
      router.refresh();
    });
  }

  function onApproveFlyer() {
    if (!eventId) return;
    startTransition(async () => {
      const r = await approveEventFlyer(eventId);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast(eventApproved ? "Flyer approved — event published." : "Flyer approved.", "success");
      router.refresh();
    });
  }

  function onRejectFlyer() {
    if (!eventId) return;
    if (!showRejectBox) {
      setShowRejectBox(true);
      return;
    }
    startTransition(async () => {
      const r = await rejectEventFlyer(eventId, rejectNotes, routeToDesigner);
      if (!r.ok) {
        toast(r.error, "error");
        return;
      }
      toast("Flyer sent back with your notes.", "success");
      setShowRejectBox(false);
      setRejectNotes("");
      router.refresh();
    });
  }

  const radio = (value: FlyerMode, title: string, sub: string) => {
    const on = mode === value;
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={() => onModeChange(value)}
        style={{
          flex: "1 1 160px",
          textAlign: "left",
          background: on ? "rgba(231,184,78,.1)" : "#0d1424",
          border: `1.5px solid ${on ? "rgba(231,184,78,.5)" : "rgba(244,241,234,.12)"}`,
          borderRadius: "12px",
          padding: "12px 14px",
          cursor: "pointer",
          color: "inherit",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              width: "15px",
              height: "15px",
              borderRadius: "50%",
              border: `2px solid ${on ? "#e7b84e" : "rgba(244,241,234,.3)"}`,
              background: on ? "radial-gradient(circle at center, #e7b84e 45%, transparent 50%)" : "transparent",
              flexShrink: 0,
            }}
          />
          <span style={{ fontSize: "13.5px", fontWeight: 800, color: "#f4f1ea" }}>{title}</span>
        </span>
        <span style={{ display: "block", marginTop: "5px", fontSize: "12px", color: "#9aa3b8", lineHeight: 1.45 }}>
          {sub}
        </span>
      </button>
    );
  };

  return (
    <div
      style={{
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "14px",
        padding: "16px",
      }}
    >
      <label style={labelStyle}>Flyer</label>
      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
        {radio("none", "No flyer", "Publish with the standard event card only.")}
        {radio("uploaded", "I have a flyer", "Upload a finished flyer (JPG/PNG, up to 4 MB).")}
        {radio(
          "requested",
          "Request a flyer",
          "The design team creates one after your details are approved; it gets a second pastoral approval before the event goes live.",
        )}
      </div>

      {/* Status banner */}
      {mode !== "none" && status !== "none" && (
        <div
          style={{
            marginTop: "12px",
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            background:
              status === "approved"
                ? "rgba(78,184,107,.14)"
                : status === "rejected"
                  ? "rgba(181,50,65,.14)"
                  : "rgba(231,184,78,.12)",
            color: status === "approved" ? "#7ed996" : status === "rejected" ? "#ff8a8a" : "#e7b84e",
            fontSize: "11px",
            fontWeight: 800,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            padding: "6px 11px",
            borderRadius: "7px",
          }}
        >
          {FLYER_STATUS_LABELS[status]}
        </div>
      )}
      {flyer.flyer_notes && (status === "rejected" || status === "awaiting_design") && (
        <div
          style={{
            marginTop: "10px",
            background: "rgba(181,50,65,.08)",
            border: "1px solid rgba(181,50,65,.35)",
            borderRadius: "10px",
            padding: "11px 14px",
            color: "#f4f1ea",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          <span style={{ color: "#ff8a8a", fontWeight: 800, fontSize: "11px", letterSpacing: "0.08em", textTransform: "uppercase", display: "block", marginBottom: "4px" }}>
            Notes from the reviewer
          </span>
          {flyer.flyer_notes}
        </div>
      )}

      {/* Upload area */}
      {mode === "uploaded" && (
        <div style={{ marginTop: "14px" }}>
          {!eventId ? (
            <p style={{ color: "#9aa3b8", fontSize: "12.5px", fontWeight: 600 }}>
              Save the event as a draft first, then attach the flyer here.
            </p>
          ) : (
            <div style={{ display: "flex", gap: "14px", alignItems: "flex-start", flexWrap: "wrap" }}>
              {url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={url}
                  alt="Flyer preview"
                  style={{
                    width: "130px",
                    borderRadius: "10px",
                    border: "1px solid rgba(244,241,234,.14)",
                    display: "block",
                  }}
                />
              )}
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <button
                  type="button"
                  onClick={pickFile}
                  disabled={busy || disabled}
                  style={{
                    background: "#1a2438",
                    color: "#cdd3e0",
                    fontWeight: 800,
                    fontSize: "12px",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    padding: "10px 16px",
                    borderRadius: "9px",
                    border: "1px solid rgba(244,241,234,.14)",
                    cursor: busy ? "wait" : "pointer",
                  }}
                >
                  {busy ? "Uploading…" : url ? "Replace flyer" : "Upload flyer"}
                </button>
                {url && status !== "approved" && (
                  <button
                    type="button"
                    onClick={onRemove}
                    disabled={busy}
                    style={{
                      background: "transparent",
                      color: "#ff8a8a",
                      fontWeight: 800,
                      fontSize: "12px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      padding: "10px 16px",
                      borderRadius: "9px",
                      border: "1px solid rgba(255,138,138,.3)",
                      cursor: "pointer",
                    }}
                  >
                    Remove
                  </button>
                )}
                {url && status === "rejected" && (
                  <button
                    type="button"
                    onClick={onSubmitFlyer}
                    disabled={busy}
                    style={{
                      background: "#e7b84e",
                      color: "#0b101c",
                      fontWeight: 800,
                      fontSize: "12px",
                      letterSpacing: "0.04em",
                      textTransform: "uppercase",
                      padding: "10px 16px",
                      borderRadius: "9px",
                      border: "none",
                      cursor: "pointer",
                    }}
                  >
                    Resubmit for approval
                  </button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" onChange={onFileChosen} style={{ display: "none" }} />
            </div>
          )}
        </div>
      )}

      {/* Request brief */}
      {mode === "requested" && (
        <div style={{ marginTop: "14px" }}>
          <label style={labelStyle}>Design notes for the team (optional)</label>
          <textarea
            value={requestNotes}
            onChange={(e) => onRequestNotesChange(e.target.value)}
            rows={3}
            disabled={disabled}
            placeholder="Colors, photos, must-include text…"
            style={{ ...inputStyle, resize: "vertical" }}
          />
        </div>
      )}

      {/* Pastoral review strip */}
      {canApprove && eventId && path && status === "submitted" && (
        <div
          style={{
            marginTop: "16px",
            borderTop: "1px solid rgba(244,241,234,.08)",
            paddingTop: "14px",
          }}
        >
          <span style={{ ...labelStyle, color: "#e7b84e" }}>
            {eventApproved ? "Flyer review — approving publishes the event" : "Flyer review"}
          </span>
          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={onApproveFlyer}
              disabled={busy}
              style={{
                background: "rgba(78,184,107,.22)",
                color: "#7ed996",
                fontWeight: 800,
                fontSize: "12.5px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "11px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(78,184,107,.4)",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {eventApproved ? "Approve flyer & publish" : "Approve flyer"}
            </button>
            <button
              type="button"
              onClick={onRejectFlyer}
              disabled={busy}
              style={{
                background: "rgba(181,50,65,.18)",
                color: "#ff8a8a",
                fontWeight: 800,
                fontSize: "12.5px",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                padding: "11px 18px",
                borderRadius: "10px",
                border: "1px solid rgba(181,50,65,.4)",
                cursor: busy ? "wait" : "pointer",
              }}
            >
              {showRejectBox ? "Send notes" : "Request changes…"}
            </button>
          </div>
          {showRejectBox && (
            <div style={{ marginTop: "10px" }}>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
                placeholder="What needs to change on the flyer?"
                style={{ ...inputStyle, resize: "vertical" }}
                autoFocus
              />
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "9px",
                  marginTop: "8px",
                  color: "#cdd3e0",
                  fontSize: "13px",
                }}
              >
                <input
                  type="checkbox"
                  checked={routeToDesigner}
                  onChange={(e) => setRouteToDesigner(e.target.checked)}
                  style={{ width: "16px", height: "16px", accentColor: "#e7b84e" }}
                />
                Send to the design team for a redesign
              </label>
              <p style={{ marginTop: "6px", color: "#9aa3b8", fontSize: "12px" }}>
                Click <strong>Request changes…</strong> again to send.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
