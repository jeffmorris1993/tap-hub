import { NextResponse, type NextRequest } from "next/server";
import { supabaseSession, isAllowedAdminEmail } from "../../../lib/supabase/auth";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/admin";

  if (!code) {
    return NextResponse.redirect(new URL("/admin/login?error=expired", origin));
  }

  const sb = await supabaseSession();
  const { data, error } = await sb.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] exchange failed", error);
    return NextResponse.redirect(new URL("/admin/login?error=expired", origin));
  }

  if (!isAllowedAdminEmail(data.user?.email)) {
    await sb.auth.signOut();
    return NextResponse.redirect(new URL("/admin/login?error=domain", origin));
  }

  const safeNext = next.startsWith("/admin") ? next : "/admin";
  return NextResponse.redirect(new URL(safeNext, origin));
}
