import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { supabaseSession } from "../../../lib/supabase/auth";
import { safeNext } from "../../../lib/site-origin";
import { syncWorkspaceAccess } from "../../../lib/workspace-groups";

/** Set by /auth/signin/google so Google's redirect doesn't have to carry it. */
const NEXT_COOKIE = "portal-oauth-next";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  const cookieStore = await cookies();
  // Magic links still pass ?next=; the Google flow leaves it in a cookie.
  const next = safeNext(searchParams.get("next") ?? cookieStore.get(NEXT_COOKIE)?.value);
  const clearNext = (res: NextResponse) => {
    res.cookies.delete(NEXT_COOKIE);
    return res;
  };

  if (!code) {
    return clearNext(NextResponse.redirect(new URL("/portal/login?error=expired", origin)));
  }

  const sb = await supabaseSession();
  const { data: exchanged, error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange failed", error);
    // Distinguish a missing PKCE verifier from a genuinely stale link —
    // otherwise a cookie regression is indistinguishable from normal expiry.
    const pkce =
      error.code === "pkce_code_verifier_missing" || /code verifier/i.test(error.message);
    return clearNext(
      NextResponse.redirect(new URL(`/portal/login?error=${pkce ? "oauth" : "expired"}`, origin)),
    );
  }

  // Apply Workspace group membership to the profile. This is the right seam
  // for it — the DB trigger that creates profiles is security-definer SQL and
  // cannot make an outbound HTTPS call. It never throws, so a Google outage
  // costs the person their role update, not their sign-in.
  if (exchanged?.user) await syncWorkspaceAccess(exchanged.user);

  // Any confirmed user may hold a session — members sign up with any email.
  // What they can SEE is decided by their portal role (lib/portal-auth.ts),
  // not by their email domain.
  return clearNext(NextResponse.redirect(new URL(next, origin)));
}
