"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Back-arrow chevron with phone-app-style behavior: prefers
 * router.back() when the previous page was on this site (so /events
 * landed-on-from-/announcements returns to /announcements instead of
 * the events list), and falls back to a sensible static URL when the
 * user landed here directly (NFC tap, deep link, fresh tab).
 */
export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    // Same-origin referrer = we have a real "previous page" within the
    // app. history.length > 1 alone isn't enough (some browsers report 2
    // on a fresh tab) — checking the referrer host gives us a stronger
    // signal that router.back() will actually do something useful.
    try {
      const ref = document.referrer;
      if (!ref) return;
      const url = new URL(ref);
      if (url.origin === window.location.origin) setCanGoBack(true);
    } catch {
      // bad referrer, fall through
    }
  }, []);

  function onClick(e: React.MouseEvent<HTMLAnchorElement>) {
    if (canGoBack) {
      e.preventDefault();
      router.back();
    }
    // else: let the <a> navigate to the fallback href normally
  }

  return (
    <a
      href={fallback}
      onClick={onClick}
      aria-label="Back"
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "11px",
        background: "#1a2438",
        border: "1px solid rgba(244,241,234,.1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        textDecoration: "none",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
        <path
          d="M15 6l-6 6 6 6"
          stroke="#f4f1ea"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </a>
  );
}
