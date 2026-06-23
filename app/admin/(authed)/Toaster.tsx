"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastKind = "success" | "error" | "info";

type Toast = { id: number; kind: ToastKind; message: string };

type ToastContextValue = {
  toast: (message: string, kind?: ToastKind) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    // Render outside the provider just no-ops so we never crash a page in
    // dev if it gets rendered standalone.
    return { toast: () => {} };
  }
  return ctx;
}

const KIND_STYLES: Record<ToastKind, { bg: string; border: string; color: string; accent: string }> = {
  success: {
    bg: "rgba(78,184,107,.12)",
    border: "rgba(78,184,107,.45)",
    color: "#bdf2c9",
    accent: "#7ed996",
  },
  error: {
    bg: "rgba(181,50,65,.12)",
    border: "rgba(255,138,138,.45)",
    color: "#ffd1d1",
    accent: "#ff8a8a",
  },
  info: {
    bg: "rgba(231,184,78,.12)",
    border: "rgba(231,184,78,.45)",
    color: "#f4e6c2",
    accent: "#e7b84e",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, kind: ToastKind = "success") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, kind, message }]);
      // auto-dismiss after 4s
      setTimeout(() => dismiss(id), 4000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="false"
        style={{
          position: "fixed",
          bottom: "24px",
          right: "24px",
          left: "24px",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-end",
          gap: "10px",
          pointerEvents: "none",
          zIndex: 100,
        }}
      >
        {toasts.map((t) => {
          const s = KIND_STYLES[t.kind];
          return (
            <div
              key={t.id}
              role="status"
              onClick={() => dismiss(t.id)}
              style={{
                pointerEvents: "auto",
                cursor: "pointer",
                background: "#121a2e",
                backgroundImage: `linear-gradient(${s.bg}, ${s.bg})`,
                border: `1px solid ${s.border}`,
                borderLeft: `4px solid ${s.accent}`,
                borderRadius: "12px",
                padding: "12px 16px",
                color: s.color,
                fontSize: "13.5px",
                fontWeight: 700,
                lineHeight: 1.4,
                maxWidth: "420px",
                boxShadow: "0 14px 38px rgba(0,0,0,.42)",
                animation: "tap-toast-in .22s ease-out",
              }}
            >
              {t.message}
            </div>
          );
        })}
      </div>
      <style>{`
        @keyframes tap-toast-in {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

/**
 * Reads a `?flash=<key>` search param on mount and pops the matching toast.
 * Use this when a server action / form post navigates somewhere new — the
 * destination page can show the success toast.
 */
const FLASH_MESSAGES: Record<string, { kind: ToastKind; message: string }> = {
  "event-saved": { kind: "success", message: "Event saved." },
  "event-submitted": { kind: "success", message: "Submitted for approval." },
  "event-approved": { kind: "success", message: "Event approved + published." },
  "event-rejected": { kind: "success", message: "Event sent back to the submitter." },
  "event-deleted": { kind: "success", message: "Event deleted." },
  "event-unpublished": { kind: "success", message: "Event unpublished." },
  "event-republished": { kind: "success", message: "Event republished." },
  "announcement-saved": { kind: "success", message: "Announcement saved." },
  "announcement-deleted": { kind: "success", message: "Announcement deleted." },
};

function popFlash(key: string | null): { kind: ToastKind; message: string } | null {
  if (!key) return null;
  return FLASH_MESSAGES[key] ?? null;
}

export function FlashConsumer() {
  const { toast } = useToast();
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Query-string flash (most actions navigate with ?flash=...).
    const params = new URLSearchParams(window.location.search);
    const fromQs = popFlash(params.get("flash"));
    if (fromQs) {
      toast(fromQs.message, fromQs.kind);
      params.delete("flash");
      const newQs = params.toString();
      const newUrl = window.location.pathname + (newQs ? `?${newQs}` : "") + window.location.hash;
      window.history.replaceState({}, "", newUrl);
    }

    // Session-storage flash (used when the server redirects so we can't
    // append ?flash=... ourselves — e.g. deleteEvent).
    let fromStorage: { kind: ToastKind; message: string } | null = null;
    try {
      const key = sessionStorage.getItem("admin-flash");
      if (key) {
        sessionStorage.removeItem("admin-flash");
        fromStorage = popFlash(key);
      }
    } catch {}
    if (fromStorage) toast(fromStorage.message, fromStorage.kind);
  }, [toast]);
  return null;
}
