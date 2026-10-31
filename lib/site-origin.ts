import "server-only";
import { headers } from "next/headers";

/**
 * The origin the browser actually used for this request.
 *
 * Auth redirects have to come back to the same host the person started on, or
 * the session cookie lands on the wrong origin — so this is read from the
 * request rather than from a fixed env var. That is what keeps localhost
 * sign-ins on localhost and preview deploys on the preview domain.
 * NEXT_PUBLIC_SITE_URL is only the fallback for contexts with no request.
 */
export async function siteOrigin(): Promise<string> {
  const h = await headers();
  const explicit = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (explicit) return `${proto}://${explicit}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Clamp a `next` destination to the portal, so a crafted link can't bounce
 *  someone off-site after sign-in. */
export function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/portal") ? next : "/portal";
}
