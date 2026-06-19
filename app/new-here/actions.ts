"use server";

import { supabaseAdmin } from "../../lib/supabase/server";
import { notifyWelcomeTeam } from "../../lib/email/welcome";

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

  const name = input.name.trim();
  const email = input.email?.trim() || null;
  const phone = input.phone?.trim() || null;

  const { error } = await supabaseAdmin().from("visitors").insert({
    name,
    email,
    phone,
    first_time: input.firstTime,
    interests: input.interests,
    source: "tap-hub",
  });
  if (error) {
    console.error("[new-here] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  await notifyWelcomeTeam({
    name,
    email,
    phone,
    firstTime: input.firstTime,
    interests: input.interests,
  });

  const firstName = (name.split(/\s+/)[0] ?? "friend").slice(0, 40);
  return { ok: true, firstName };
}
