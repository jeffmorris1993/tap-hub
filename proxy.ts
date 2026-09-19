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

  return response;
}

export const config = {
  matcher: ["/portal/:path*"],
};
