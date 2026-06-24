"use client";

import { useEffect } from "react";

/**
 * Belt-and-suspenders: after the page mounts, look at the URL hash and
 * manually scroll the matching element into view. Browsers SHOULD do
 * this natively on hash navigation, but Next.js client-side route
 * transitions sometimes drop the anchor jump — particularly when the
 * destination page is dynamically rendered. Pairs with `scrollMarginTop`
 * on the target so the sticky header doesn't cover it.
 */
export function ScrollToHash() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.slice(1);
    if (!hash) return;
    const el = document.getElementById(decodeURIComponent(hash));
    if (el) {
      // Two rAFs let the layout settle before the scroll lands.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollIntoView({ behavior: "auto", block: "start" });
        });
      });
    }
  }, []);
  return null;
}
