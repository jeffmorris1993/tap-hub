import { CHURCH_TZ } from "./tz";

/**
 * Format an ISO timestamp for admin / display in the church's local
 * timezone. Server components on Vercel default to UTC, so without
 * passing `timeZone` everything was rendering 4-5 hours off (depending
 * on EDT/EST).
 */
export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-US", {
      timeZone: CHURCH_TZ,
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString("en-US", {
      timeZone: CHURCH_TZ,
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}
