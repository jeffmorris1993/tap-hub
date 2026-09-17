import "server-only";
import { CHURCH_TZ, localToUtcIso } from "./tz";

/**
 * Feature window for the temporary Ignite Youth parent/family update form.
 *
 * ── To change when the promotion ends, edit IGNITE_PARENT_FORM_CLOSE_DATE
 *    below, or set the env var of the same name to override it without a
 *    code change. ───────────────────────────────────────────────────────
 *
 * Closing only changes the UI. The /ignite/parent-update route keeps
 * responding (with a friendly "closed" screen rather than a 404, so the
 * printed QR code never dead-ends) and every collected submission is kept.
 */

/** Hard off-switch. Set IGNITE_PARENT_FORM_ENABLED=false to pull the promo early. */
export const IGNITE_PARENT_FORM_ENABLED =
  (process.env.IGNITE_PARENT_FORM_ENABLED ?? "true").toLowerCase() !== "false";

/**
 * Detroit wall-clock "YYYY-MM-DDTHH:MM" — the last moment the form accepts
 * submissions. Set to an empty string (or IGNITE_PARENT_FORM_CLOSE_DATE="")
 * to leave the form open indefinitely.
 */
export const IGNITE_PARENT_FORM_CLOSE_DATE =
  process.env.IGNITE_PARENT_FORM_CLOSE_DATE ?? "2026-12-31T23:59";

/** The QR-code destination. Works independently of the Tap Hub promo card. */
export const IGNITE_PARENT_FORM_PATH = "/ignite/parent-update";

function closeInstantMs(): number | null {
  const raw = IGNITE_PARENT_FORM_CLOSE_DATE.trim();
  if (!raw) return null;
  const iso = localToUtcIso(raw);
  if (!iso) {
    // Fail OPEN on a malformed date. A typo here must not silently kill the
    // QR code in the middle of the parent meeting.
    console.warn(
      `[ignite-form] IGNITE_PARENT_FORM_CLOSE_DATE is not "YYYY-MM-DDTHH:MM" (got "${raw}") — treating the form as open.`,
    );
    return null;
  }
  return new Date(iso).getTime();
}

/** True while the form accepts submissions and the Tap Hub card should show. */
export function igniteParentFormOpen(now: Date = new Date()): boolean {
  if (!IGNITE_PARENT_FORM_ENABLED) return false;
  const closeMs = closeInstantMs();
  if (closeMs === null) return true;
  return now.getTime() <= closeMs;
}

/** "December 31, 2026" for UI copy, or null when there's no close date. */
export function igniteParentFormCloseLabel(): string | null {
  const closeMs = closeInstantMs();
  if (closeMs === null) return null;
  return new Date(closeMs).toLocaleDateString("en-US", {
    timeZone: CHURCH_TZ,
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
