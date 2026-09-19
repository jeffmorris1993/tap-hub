"use server";

import { supabaseAdmin } from "../../lib/supabase/server";
import { supabaseSession } from "../../lib/supabase/auth";
import { notifyPrayerTeam } from "../../lib/email/prayer";
import { EVENT_CATEGORIES } from "../../lib/event-categories";

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
  /** Optional ministry tag (Youth / Sisterhood / … / General). */
  ministry?: string;
};

export type FeedbackResult =
  | { ok: true; kind: "feedback" | "prayer" }
  | { ok: false; error: string };

/** The signed-in user's id, or null for anonymous submissions. */
async function sessionUserId(): Promise<string | null> {
  try {
    const session = await supabaseSession();
    const { data } = await session.auth.getUser();
    return data.user?.id ?? null;
  } catch {
    return null;
  }
}

/** Topic → ministry mapping so lead roles see feedback for their ministry.
 *  The feedback form's categories are topics ("Kids & Youth", "Sunday
 *  Service"), not ministries — only the youth topic maps today. */
function ministryForFeedbackCategory(category: string): string {
  return category === "Kids & Youth" ? "Youth" : "General";
}

export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  if (!input.message?.trim()) return { ok: false, error: "Please share a bit about your experience." };

  const { error } = await supabaseAdmin().from("feedback").insert({
    rating: input.rating || null,
    category: input.category,
    ministry: ministryForFeedbackCategory(input.category),
    name: input.name?.trim() || null,
    message: input.message.trim(),
    user_id: await sessionUserId(),
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
  const ministry = (EVENT_CATEGORIES as readonly string[]).includes(input.ministry ?? "")
    ? (input.ministry as string)
    : "General";

  const { error } = await supabaseAdmin().from("prayer_requests").insert({
    name,
    contact,
    request,
    confidential: true,
    prayer_wall: false,
    ministry,
    user_id: await sessionUserId(),
  });
  if (error) {
    console.error("[prayer] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  await notifyPrayerTeam({ name, contact, request, prayerWall: false });

  return { ok: true, kind: "prayer" };
}
