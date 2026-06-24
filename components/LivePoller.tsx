"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Drop-in client component that calls router.refresh() every `intervalMs`
 * while the tab is visible, plus a one-off refresh whenever the tab
 * becomes visible again. Lets a Server Component page stay live with
 * newly approved data without a manual reload.
 */
export function LivePoller({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter();
  useEffect(() => {
    function tick() {
      if (document.visibilityState === "visible") router.refresh();
    }
    const id = setInterval(tick, intervalMs);
    function onVisibility() {
      if (document.visibilityState === "visible") router.refresh();
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [router, intervalMs]);
  return null;
}
