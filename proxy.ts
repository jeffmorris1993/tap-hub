import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// Coarse gate only: /portal/* requires a session. WHO may see WHAT (member
// vs lead vs pastoral) is decided in the app via lib/portal-auth.ts —
// middleware can't cheaply consult the profiles table, so it never tries.
// Members sign up with any email; there is no domain check here anymore.
const PUBLIC_PORTAL_PATHS = [
  "/portal/login",
  "/portal/signup",
  "/portal/reset",
  "/auth/callback",
  "/auth/sign-out",
];

// App-level session limits (Supabase's own [auth.sessions] timebox needs a
// Pro plan): hard cap 7 days, signed out after 24h without portal activity.
const SESSION_TIMEBOX_MS = 7 * 24 * 3600_000;
const SESSION_IDLE_MS = 24 * 3600_000;
const SESSION_START_COOKIE = "portal-session-start";
const SESSION_SEEN_COOKIE = "portal-last-seen";

function expireSession(request: NextRequest, pathname: string): NextResponse {
  const redirect = new URL("/portal/login", request.url);
  redirect.searchParams.set("next", pathname);
  redirect.searchParams.set("error", "expired");
  const res = NextResponse.redirect(redirect);
  // Drop the Supabase auth cookies plus our trackers so the next visit
  // starts clean.
  for (const c of request.cookies.getAll()) {
    if (c.name.startsWith("sb-")) res.cookies.delete(c.name);
  }
  res.cookies.delete(SESSION_START_COOKIE);
  res.cookies.delete(SESSION_SEEN_COOKIE);
  return res;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (!pathname.startsWith("/portal")) return NextResponse.next();
  if (PUBLIC_PORTAL_PATHS.some((p) => pathname.startsWith(p))) return NextResponse.next();

  const response = NextResponse.next();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    const redirect = new URL("/portal/login?error=config", request.url);
    return NextResponse.redirect(redirect);
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(toSet) {
        for (const { name, value, options } of toSet) {
          response.cookies.set({ name, value, ...options });
        }
      },
    },
  });

  const { data } = await supabase.auth.getUser();
  if (!data.user) {
    const redirect = new URL("/portal/login", request.url);
    redirect.searchParams.set("next", pathname);
    return NextResponse.redirect(redirect);
  }

  // Enforce session lifetime: hard 7-day cap from first portal visit of this
  // session, 24h idle timeout between portal visits.
  const now = Date.now();
  const start = Number(request.cookies.get(SESSION_START_COOKIE)?.value) || 0;
  const seen = Number(request.cookies.get(SESSION_SEEN_COOKIE)?.value) || 0;
  if ((start && now - start > SESSION_TIMEBOX_MS) || (seen && now - seen > SESSION_IDLE_MS)) {
    return expireSession(request, pathname);
  }
  const cookieOpts = { httpOnly: true, sameSite: "lax" as const, path: "/", maxAge: 30 * 24 * 3600 };
  if (!start) response.cookies.set({ name: SESSION_START_COOKIE, value: String(now), ...cookieOpts });
  response.cookies.set({ name: SESSION_SEEN_COOKIE, value: String(now), ...cookieOpts });

  return response;
}

export const config = {
  matcher: ["/portal/:path*"],
};
