"use server";

import { headers } from "next/headers";
import { supabaseSession } from "../../../../lib/supabase/auth";

export type ResetRequestResult = { ok: true } | { ok: false; error: string };
export type ResetConfirmResult = { ok: true } | { ok: false; error: string };

async function siteOrigin(): Promise<string> {
  const h = await headers();
  const explicit = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "https";
  if (explicit) return `${proto}://${explicit}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

export async function requestPasswordReset(email: string): Promise<ResetRequestResult> {
  const e = email?.trim().toLowerCase();
  if (!e) return { ok: false, error: "Email is required." };

  const sb = await supabaseSession();
  const origin = await siteOrigin();
  const { error } = await sb.auth.resetPasswordForEmail(e, {
    // Clean URL, no query: the recovery template appends
    // ?token_hash=…&type=recovery&next=/portal/reset/confirm itself via
    // {{ .RedirectTo }} — so localhost requests produce localhost links.
    redirectTo: `${origin}/auth/confirm`,
  });
  if (error) {
    console.error("[reset] request failed", error);
    return { ok: false, error: "Couldn't send the reset email. Try again in a moment." };
  }
  return { ok: true };
}

/** Runs with the recovery session established by the emailed link. */
export async function confirmPasswordReset(password: string): Promise<ResetConfirmResult> {
  if (!password || password.length < 8) {
    return { ok: false, error: "Pick a password with at least 8 characters." };
  }

  const sb = await supabaseSession();
  const { data } = await sb.auth.getUser();
  if (!data.user) {
    return { ok: false, error: "That reset link expired. Request a new one." };
  }
  const { error } = await sb.auth.updateUser({ password });
  if (error) {
    console.error("[reset] update failed", error);
    return { ok: false, error: "Couldn't update your password. Request a new reset link." };
  }
  return { ok: true };
}
