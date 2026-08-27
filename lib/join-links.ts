// Maps a schedule row's location text to a tap-to-join link. Rows whose
// location mentions a conference call get a tel: link; rows on Zoom get the
// meeting URL. Values come from NEXT_PUBLIC_ env vars (referenced as static
// literals so they inline into the client bundle); when unset, no link shows —
// same hide-when-unset pattern as LIVE_STREAM_URL on the hub page.

const CONFERENCE_PHONE = process.env.NEXT_PUBLIC_CONFERENCE_PHONE ?? "";
const ZOOM_URL = process.env.NEXT_PUBLIC_ZOOM_URL ?? "";

export type JoinLink = { kind: "phone" | "zoom"; href: string; label: string };

export function getJoinLink(where: string): JoinLink | null {
  if (/zoom/i.test(where)) {
    if (!ZOOM_URL) return null;
    return { kind: "zoom", href: ZOOM_URL, label: "Join on Zoom" };
  }
  if (/conference|call[- ]?in|dial/i.test(where)) {
    if (!CONFERENCE_PHONE) return null;
    return { kind: "phone", href: `tel:${CONFERENCE_PHONE}`, label: "Join by Phone" };
  }
  return null;
}
