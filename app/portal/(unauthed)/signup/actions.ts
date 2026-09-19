"use server";

import { headers } from "next/headers";
import { supabaseSession } from "../../../../lib/supabase/auth";

export type SignupInput = { name: string; email: string; password: string };
export type SignupResult = { ok: true } | { ok: false; error: string };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const explicit = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (explicit) return `${proto}://${explicit}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

/** Member account creation — open to ANY email. The auth trigger creates a
 *  member profile; lead/pastoral roles are assigned later in /portal/users. */
export async function signUp(input: SignupInput): Promise<SignupResult> {
  const name = input.name?.trim();
  const email = input.email?.trim().toLowerCase();
  if (!name) return { ok: false, error: "Please share your name." };
  if (!email) return { ok: false, error: "Email is required." };
  if (!input.password || input.password.length < 8) {
    return { ok: false, error: "Pick a password with at least 8 characters." };
  }

  const sb = await supabaseSession();
  const origin = await siteOrigin();
  const { data, error } = await sb.auth.signUp({
    email,
    password: input.password,
    options: {
      data: { full_name: name },
      // Clean URL, no query: the confirmation template appends
      // ?token_hash=…&type=signup itself via {{ .RedirectTo }}.
      emailRedirectTo: `${origin}/auth/confirm`,
    },
  });
  if (error) {
    if (error.code === "user_already_exists" || /already registered/i.test(error.message)) {
      return { ok: false, error: "An account with that email already exists — sign in instead." };
    }
    if (error.code === "weak_password") {
      return { ok: false, error: "That password is too weak. Try a longer one." };
    }
    console.error("[signup] failed", error);
    return { ok: false, error: "Couldn't create your account. Try again in a moment." };
  }

  // Supabase obfuscates existing-email signups (empty identities array) so
  // the form can't be used to probe who has an account.
  if (data.user && data.user.identities?.length === 0) {
    return { ok: false, error: "An account with that email already exists — sign in instead." };
  }

  return { ok: true };
}
