"use server";

import { supabaseAdmin } from "../../lib/supabase/server";
import { notifyPrayerTeam } from "../../lib/email/prayer";

export type FeedbackInput = {
  kind: "feedback";
  rating: number;
  category: string;
  name: string;
  message: string;
};

export type PrayerInput = {
  kind: "prayer";
  name: string;
  contact: string;
  request: string;
};

export type FeedbackResult =
  | { ok: true; kind: "feedback" | "prayer" }
  | { ok: false; error: string };

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  if (!input.message?.trim()) return { ok: false, error: "Please share a bit about your experience." };

  const { error } = await supabaseAdmin().from("feedback").insert({
    rating: input.rating || null,
    category: input.category,
    name: input.name?.trim() || null,
    message: input.message.trim(),
  });
  if (error) {
    console.error("[feedback] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }
  return { ok: true, kind: "feedback" };
}

export async function submitPrayer(input: PrayerInput): Promise<FeedbackResult> {
  if (!input.request?.trim()) return { ok: false, error: "Please share your prayer request." };

  const name = input.name?.trim() || null;
  const contact = input.contact?.trim() || null;
  const request = input.request.trim();

  const { error } = await supabaseAdmin().from("prayer_requests").insert({
    name,
    contact,
    request,
    confidential: true,
    prayer_wall: false,
  });
  if (error) {
    console.error("[prayer] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  await notifyPrayerTeam({ name, contact, request, prayerWall: false });

  return { ok: true, kind: "prayer" };
}
