"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseSession, isAllowedAdminEmail } from "../../../../lib/supabase/auth";

export type LoginInput = { email: string; next: string };
export type LoginResult = { ok: true } | { ok: false; error: string };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const explicit = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (explicit) return `${proto}://${explicit}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function sendMagicLink(input: LoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };
  if (!isAllowedAdminEmail(email)) {
    return { ok: false, error: "Use your @nehtemple.org email address." };
  }

  const sb = await supabaseSession();
  const origin = await siteOrigin();
  const next = input.next.startsWith("/admin") ? input.next : "/admin";
  const emailRedirectTo = `${origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const { error } = await sb.auth.signInWithOtp({
    email,
    options: { emailRedirectTo },
  });
  if (error) {
    console.error("[login] magic link send failed", error);
    return { ok: false, error: "Couldn't send link. Try again in a moment." };
  }

  redirect(`/admin/login?sent=1&next=${encodeURIComponent(next)}`);
}
