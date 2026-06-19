"use server";

import { supabaseAdmin } from "../../lib/supabase/server";

export type NewHereSubmission = {
  name: string;
  email: string;
  phone: string;
  firstTime: boolean | null;
  interests: string[];
};

export type NewHereResult =
  | { ok: true; firstName: string }
  | { ok: false; error: string };

export async function submitNewHere(input: NewHereSubmission): Promise<NewHereResult> {
  if (!input.name?.trim()) return { ok: false, error: "Please share your name." };
  if (!input.email?.trim() && !input.phone?.trim()) {
    return { ok: false, error: "Email or phone helps us follow up." };
  }

  const { error } = await supabaseAdmin().from("visitors").insert({
    name: input.name.trim(),
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    first_time: input.firstTime,
    interests: input.interests,
    source: "tap-hub",
  });
  if (error) {
    console.error("[new-here] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  const firstName = (input.name.trim().split(/\s+/)[0] ?? "friend").slice(0, 40);
  return { ok: true, firstName };
}
