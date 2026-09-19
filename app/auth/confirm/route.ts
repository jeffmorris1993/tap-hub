import { NextResponse, type NextRequest } from "next/server";
import type { EmailOtpType } from "@supabase/supabase-js";
import { supabaseSession } from "../../../lib/supabase/auth";

/**
 * Token-hash verification target for the auth EMAIL TEMPLATES.
 *
 * The templates link here as
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/portal/reset/confirm
 * instead of using {{ .ConfirmationURL }}. That sidesteps the redirect-URL
 * allowlist entirely: the destination is baked into the template, so a
 * recovery link always lands on the reset page — never the homepage.
 * (/auth/callback still handles the PKCE ?code= flow.)
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const next = searchParams.get("next") ?? "/portal";
  const safeNext = next.startsWith("/portal") ? next : "/portal";

  if (tokenHash && type) {
    const sb = await supabaseSession();
    const { error } = await sb.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      return NextResponse.redirect(new URL(safeNext, origin));
    }
    console.error("[auth/confirm] verifyOtp failed", error);
  }

  return NextResponse.redirect(new URL("/portal/login?error=expired", origin));
}
