"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { supabaseSession } from "../../../../lib/supabase/auth";

export type LoginInput = { email: string; next: string };
export type PasswordLoginInput = { email: string; password: string; next: string };
export type LoginResult = { ok: true } | { ok: false; error: string };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const explicit = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (explicit) return `${proto}://${explicit}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

function safeNext(next: string): string {
  return next.startsWith("/portal") ? next : "/portal";
}

/** Primary sign-in: email + password. Open to any account — role decides
 *  what the portal shows, not the email domain. */
export async function signInWithPassword(input: PasswordLoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };
  if (!input.password) return { ok: false, error: "Password is required." };

  const sb = await supabaseSession();
  const { error } = await sb.auth.signInWithPassword({ email, password: input.password });
  if (error) {
    if (error.code === "email_not_confirmed") {
      return { ok: false, error: "Confirm your email first — check your inbox for the confirmation link." };
    }
    return { ok: false, error: "Wrong email or password. Try again, or reset your password below." };
  }

  redirect(safeNext(input.next));
}

/** Alternative sign-in: emailed magic link. Open to any account. */
export async function sendMagicLink(input: LoginInput): Promise<LoginResult> {
  const email = input.email.trim().toLowerCase();
  if (!email) return { ok: false, error: "Email is required." };

  const sb = await supabaseSession();
  const origin = await siteOrigin();
  const next = safeNext(input.next);
  // Clean URL, no query: the email template appends ?token_hash=…&type=…
  // itself via {{ .RedirectTo }}, which keeps localhost emails pointing at
  // localhost and production emails at production.
  const emailRedirectTo = `${origin}/auth/confirm`;

  const { error } = await sb.auth.signInWithOtp({
    email,
    // Magic links only sign in EXISTING accounts; new members create one at
    // /portal/signup so we always collect a name and password.
    options: { emailRedirectTo, shouldCreateUser: false },
  });
  if (error) {
    if (error.code === "otp_disabled" || /signups not allowed/i.test(error.message)) {
      return { ok: false, error: "No account with that email yet — create one first." };
    }
    console.error("[login] magic link send failed", error);
    return { ok: false, error: "Couldn't send link. Try again in a moment." };
  }

  redirect(`/portal/login?sent=1&next=${encodeURIComponent(next)}`);
}
