/**
 * Event flyer helpers — isomorphic (no server-only): the public URL builder
 * runs in server components, and the state helpers are plain data logic.
 */

export const FLYER_BUCKET = "event-flyers";

export type FlyerMode = "none" | "uploaded" | "requested";
export type FlyerStatus = "none" | "awaiting_design" | "submitted" | "approved" | "rejected";

export type FlyerFields = {
  flyer_mode: FlyerMode;
  flyer_status: FlyerStatus;
  flyer_path: string | null;
};

/** Public, never-expiring URL for a stored flyer — sharable to Facebook and
 *  downloadable without sign-in (the bucket is public; writes are
 *  service-role only). */
export function flyerPublicUrl(path: string): string {
  const base = (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").replace(/\/$/, "");
  return `${base}/storage/v1/object/public/${FLYER_BUCKET}/${path}`;
}

/**
 * The publish gate: an event may only be published when its details are
 * approved AND its flyer (if it has one) is approved. `approveEvent` treats a
 * freshly submitted flyer as part of round-1 review, so "submitted with a
 * file" also counts as ready-to-approve there — this helper is the strict
 * "already fully approved" check used by republish.
 */
export function flyerReadyToPublish(f: Pick<FlyerFields, "flyer_mode" | "flyer_status">): boolean {
  return f.flyer_mode === "none" || f.flyer_status === "approved";
}

export const FLYER_STATUS_LABELS: Record<FlyerStatus, string> = {
  none: "No flyer",
  awaiting_design: "Awaiting design",
  submitted: "Flyer awaiting approval",
  approved: "Flyer approved",
  rejected: "Flyer changes requested",
};
