"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Back-arrow chevron with phone-app-style behavior: prefers
 * router.back() when the previous page was on this site (so /events
 * landed-on-from-/announcements returns to /announcements instead of
 * the events list), and falls back to a sensible static URL when:
 *   - the user landed here directly (NFC tap, deep link, fresh tab); or
 *   - the previous page is a CHILD of the current one. Without this
 *     check, hitting Back on /announcements after returning from
 *     /announcements/[id] would loop back into the detail page.
 */
export function BackButton({ fallback }: { fallback: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const ref = document.referrer;
      if (!ref) return;
      const url = new URL(ref);
      if (url.origin !== window.location.origin) return;
      // If the referrer lives under our current path (e.g. we're on
      // /announcements and referrer is /announcements/<id>), using
      // history would just bounce the user back into the child page.
      // Treat that as "no usable history" and fall through to the
      // static fallback.
      const refPath = url.pathname.replace(/\/+$/, "");
      const here = (pathname ?? "").replace(/\/+$/, "");
      if (here && (refPath === here || refPath.startsWith(here + "/"))) return;
      setCanGoBack(true);
    } catch {
      // bad referrer, fall through
    }
  }, [pathname]);

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
