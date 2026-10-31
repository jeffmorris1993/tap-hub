import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseSession } from "../../../../lib/supabase/auth";
import { siteOrigin, safeNext } from "../../../../lib/site-origin";

/**
 * Starts "Continue with Google": asks Supabase for the Google authorization
 * URL and sends the browser there. The round trip comes back to
 * /auth/callback, which already handles the PKCE code exchange.
 *
 * POST, not GET, and driven by a real <form> — a GET endpoint can be
 * prefetched by the browser or a <Link>, which would spend the single-use
 * code verifier before anyone clicked and leave a stale cookie behind.
 */

/** Where to land afterwards. Carried in a cookie rather than appended to
 *  `redirectTo`, so the URL handed to Supabase matches an entry in its
 *  redirect allowlist exactly, with no query string in the way. */
const NEXT_COOKIE = "portal-oauth-next";

/** Mirrors supabase-js's defaultStorageKey: `sb-<project-ref>-auth-token`. */
function verifierCookieName(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) return null;
  try {
    return `sb-${new URL(url).hostname.split(".")[0]}-auth-token-code-verifier`;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const origin = await siteOrigin();
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/portal/login?error=${code}`, origin), 303);

  // Cheap CSRF hygiene. A cross-site POST here only starts an OAuth flow, but
  // there is no reason to accept one.
  const sender = request.headers.get("origin");
  if (sender && new URL(sender).host !== new URL(origin).host) {
    console.warn("[auth/signin/google] cross-origin POST rejected", sender);
    return fail("oauth");
  }

  const form = await request.formData().catch(() => null);
  const next = safeNext(form?.get("next")?.toString());

  const cookieStore = await cookies();
  cookieStore.set(NEXT_COOKIE, next, {
    httpOnly: true,
    // `lax` is required: Google sends the browser back as a top-level
    // cross-site GET, which `strict` would strip the cookie from.
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 600,
  });

  const sb = await supabaseSession();
  const { data, error } = await sb.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: `${origin}/auth/callback`,
      queryParams: {
        // Without this, someone already signed into one Google account is
        // silently authenticated as that account — a nasty surprise on a
        // shared or office machine.
        prompt: "select_account",
      },
      // No-op server-side (it only guards a window.location call), but it
      // states the intent: we redirect ourselves, below.
      skipBrowserRedirect: true,
    },
  });

  if (error || !data?.url) {
    console.error("[auth/signin/google] could not start OAuth", error);
    return fail("oauth");
  }

  // signInWithOAuth writes the PKCE verifier through the cookie adapter in
  // lib/supabase/auth.ts, whose setAll swallows write failures by design.
  // Without this check a regression would surface one hop later as an opaque
  // "that link expired" from the callback.
  const verifier = verifierCookieName();
  if (verifier && !cookieStore.get(verifier)) {
    console.error("[auth/signin/google] PKCE verifier cookie was not written");
    return fail("oauth");
  }

  return NextResponse.redirect(data.url, 303);
}
