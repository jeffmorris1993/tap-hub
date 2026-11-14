"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * "Show flyer" button + full-screen lightbox on the public event page.
 * Share uses the native share sheet with the image attached when the browser
 * allows it (that's the path to Facebook/Instagram/Messages on phones);
 * desktop falls back to copy-link. Download fetches a blob because a plain
 * <a download> is ignored for cross-origin (Supabase storage) URLs.
 */

const btnStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: "7px",
  fontWeight: 800,
  fontSize: "12px",
  letterSpacing: "0.05em",
  textTransform: "uppercase",
  padding: "11px 16px",
  borderRadius: "10px",
  border: "1px solid rgba(244,241,234,.14)",
  background: "#1a2438",
  color: "#cdd3e0",
  cursor: "pointer",
};

export function FlyerLightbox({ flyerUrl, title }: { flyerUrl: string; title: string }) {
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  // The event page's own URL — what link-shares and copy-link send. Read
  // lazily inside handlers so SSR markup never depends on it.
  const eventUrl = () =>
    typeof window === "undefined" ? "" : window.location.origin + window.location.pathname;

  const close = useCallback(() => setOpen(false), []);
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close();
    };
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, close]);

  useEffect(() => {
    if (!note) return;
    const t = setTimeout(() => setNote(null), 2500);
    return () => clearTimeout(t);
  }, [note]);

  async function onShare() {
    try {
      // Best case: share the actual image file (lands in IG/FB/Messages).
      if (navigator.share) {
        try {
          const res = await fetch(flyerUrl);
          const blob = await res.blob();
          const file = new File([blob], "flyer.jpg", { type: blob.type || "image/jpeg" });
          if (navigator.canShare?.({ files: [file] })) {
            await navigator.share({ files: [file], title, url: eventUrl() });
            return;
          }
        } catch {
          // fall through to URL share
        }
        await navigator.share({ title, url: eventUrl() });
        return;
      }
    } catch {
      // user cancelled or share failed — fall through to copy
    }
    try {
      await navigator.clipboard.writeText(eventUrl());
      setNote("Link copied — paste it anywhere.");
    } catch {
      setNote("Couldn't share on this device.");
    }
  }

  async function onDownload() {
    try {
      const res = await fetch(flyerUrl);
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title.replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").toLowerCase() || "flyer"}.jpg`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
      setNote("Saved! Post it to your story or feed. 📣");
    } catch {
      setNote("Couldn't download — try long-pressing the image instead.");
    }
  }

  async function onCopyLink() {
    try {
      await navigator.clipboard.writeText(eventUrl());
      setNote("Link copied.");
    } catch {
      setNote("Couldn't copy the link.");
    }
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} style={btnStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e7b84e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <rect x="3.5" y="5" width="17" height="14" rx="2.5" />
          <path d="M3.5 15.5l4.8-4.6a1.6 1.6 0 012.2 0l5 4.8M14 13l2.2-2.1a1.6 1.6 0 012.2 0l2.1 2" />
          <circle cx="9" cy="9" r="1.4" fill="#e7b84e" stroke="none" />
        </svg>
        Show flyer
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} flyer`}
          onClick={close}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 90,
            background: "rgba(5,8,15,.85)",
            backdropFilter: "blur(4px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ maxWidth: "min(430px, 100%)", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "8px" }}>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                style={{
                  background: "rgba(255,255,255,.08)",
                  border: "none",
                  color: "#f4f1ea",
                  width: "36px",
                  height: "36px",
                  borderRadius: "50%",
                  fontSize: "17px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={flyerUrl}
              alt={`${title} flyer`}
              style={{
                width: "100%",
                maxHeight: "68dvh",
                objectFit: "contain",
                borderRadius: "12px",
                display: "block",
                background: "#0b101c",
              }}
            />
            <div style={{ display: "flex", gap: "8px", justifyContent: "center", marginTop: "14px", flexWrap: "wrap" }}>
              <button type="button" onClick={onShare} style={{ ...btnStyle, background: "#e7b84e", color: "#0b101c", border: "none" }}>
                ↗ Share
              </button>
              <button type="button" onClick={onDownload} style={btnStyle}>
                ⬇ Download
              </button>
              <button type="button" onClick={onCopyLink} style={btnStyle}>
                Copy link
              </button>
            </div>
            <p style={{ textAlign: "center", color: "#9aa3b8", fontSize: "11.5px", fontWeight: 600, marginTop: "10px", minHeight: "16px" }}>
              {note ?? "Share opens your phone's share sheet — Facebook, Instagram, Messages…"}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
