"use server";

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
  confidential: boolean;
  prayerWall: boolean;
};

export type FeedbackResult =
  | { ok: true; kind: "feedback" | "prayer" }
  | { ok: false; error: string };

// Phase 2 replaces these with Supabase inserts + prayer routing email.
export async function submitFeedback(input: FeedbackInput): Promise<FeedbackResult> {
  if (!input.message?.trim()) return { ok: false, error: "Please share a bit about your experience." };
  console.log("[feedback]", input);
  return { ok: true, kind: "feedback" };
}

export async function submitPrayer(input: PrayerInput): Promise<FeedbackResult> {
  if (!input.request?.trim()) return { ok: false, error: "Please share your prayer request." };
  console.log("[prayer]", input);
  // TODO(phase-2): if input.confidential, fire-and-forget email to PRAYER_TEAM_EMAIL via Resend.
  return { ok: true, kind: "prayer" };
}
