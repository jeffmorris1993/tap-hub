import { NextResponse, type NextRequest } from "next/server";
import { supabaseSession } from "../../../lib/supabase/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/portal";

  if (!code) {
    return NextResponse.redirect(new URL("/portal/login?error=expired", origin));
  }

  const sb = await supabaseSession();
  const { error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange failed", error);
    return NextResponse.redirect(new URL("/portal/login?error=expired", origin));
  }

  // Any confirmed user may hold a session — members sign up with any email.
  // What they can SEE is decided by their portal role (lib/portal-auth.ts),
  // not by their email domain.
  const safeNext = next.startsWith("/portal") ? next : "/portal";
  return NextResponse.redirect(new URL(safeNext, origin));
}
