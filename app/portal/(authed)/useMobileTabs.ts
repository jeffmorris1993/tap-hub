"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";

const MAX_TABS = 4;
const HOME = "/portal";

// Our own writes don't fire a storage event (that only fires in *other*
// tabs), so writers notify these listeners directly.
const listeners = new Set<() => void>();

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    window.removeEventListener("storage", onChange);
  };
}

function readRaw(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Storage disabled (private browsing) — fall back to the defaults.
    return null;
  }
}

function parseStored(raw: string | null): string[] | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter((x): x is string => typeof x === "string");
  } catch {
    return null;
  }
}

/**
 * Keep only hrefs this person actually has, dedupe, pin Overview first, and
 * cap the list. Guards against a stored list going stale when someone's role
 * or ministries change (e.g. a lead who loses Kids + Youth).
 */
function normalize(list: string[], valid: Set<string>): string[] {
  const kept = list.filter((href) => valid.has(href) && href !== HOME);
  return [HOME, ...new Set(kept)].slice(0, MAX_TABS);
}

/**
 * Which sections sit in the bottom tab bar, remembered per role in
 * localStorage. Read through useSyncExternalStore so the server render and
 * hydration both start from the defaults and the stored list is applied
 * right after — no hydration mismatch, no layout flash.
 */
export function useMobileTabs(role: string, navHrefs: string[], defaults: string[]) {
  const storageKey = `nt_mobile_tabs_${role}`;
  // Join to primitives so the memos below have stable, comparable deps.
  const navKey = navHrefs.join("|");
  const defaultsKey = defaults.join("|");

  const getSnapshot = useCallback(() => readRaw(storageKey), [storageKey]);
  const raw = useSyncExternalStore(subscribe, getSnapshot, () => null);

  const valid = useMemo(() => new Set(navKey.split("|").filter(Boolean)), [navKey]);

  const tabs = useMemo(
    () => normalize(parseStored(raw) ?? defaultsKey.split("|").filter(Boolean), valid),
    [raw, defaultsKey, valid],
  );

  const save = useCallback(
    (next: string[]) => {
      try {
        localStorage.setItem(storageKey, JSON.stringify(normalize(next, valid)));
      } catch {
        // Nothing persisted; the next render just keeps the current list.
      }
      listeners.forEach((l) => l());
    },
    [storageKey, valid],
  );

  const reset = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // Nothing to clean up.
    }
    listeners.forEach((l) => l());
  }, [storageKey]);

  return { tabs, save, reset, max: MAX_TABS, home: HOME };
}
