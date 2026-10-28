"use server";

import { supabaseAdmin } from "../../lib/supabase/server";
import { supabaseSession } from "../../lib/supabase/auth";
import { notifyPrayerTeam } from "../../lib/email/prayer";
import { notifyPastoralOfFeedback } from "../../lib/email/feedback";
import { resolveNotificationRecipients } from "../../lib/notification-routes";

/** Feedback arrives as FormData so an optional photo can ride along. Fields:
 *  rating, category, name, message, photo (File, optional). */

export type PrayerInput = {
  kind: "prayer";
  name: string;
  contact: string;
  request: string;
  /** Who may see the request: the Bishop alone, or Bishop + pastoral team. */
  visibility?: "bishop" | "pastoral";
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

// Photos cap at 4 MB — Vercel rejects request bodies over 4.5 MB.
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

export async function submitFeedback(form: FormData): Promise<FeedbackResult> {
  const message = String(form.get("message") ?? "").trim();
  if (!message) return { ok: false, error: "Please share a bit about your experience." };

  const category = String(form.get("category") ?? "General");
  const rating = Number(form.get("rating")) || null;
  const name = String(form.get("name") ?? "").trim() || null;
  const ministry = ministryForFeedbackCategory(category);

  // Optional photo → private feedback-photos bucket via the service role.
  const photo = form.get("photo");
  let photoPath: string | null = null;
  if (photo instanceof File && photo.size > 0) {
    if (!photo.type.startsWith("image/")) {
      return { ok: false, error: "Photos must be an image file (JPG, PNG, HEIC…)." };
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: "That photo is too large — please keep it under 4 MB." };
    }
    const ext = (photo.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    photoPath = `${crypto.randomUUID()}.${ext || "jpg"}`;
    const { error: uploadError } = await supabaseAdmin()
      .storage.from("feedback-photos")
      .upload(photoPath, photo, { contentType: photo.type });
    if (uploadError) {
      console.error("[feedback] photo upload failed", uploadError);
      return {
        ok: false,
        error: "We couldn't upload that photo. Try again, or send your feedback without it.",
      };
    }
  }

  const { error } = await supabaseAdmin().from("feedback").insert({
    rating,
    category,
    ministry,
    name,
    message,
    photo_path: photoPath,
    user_id: await sessionUserId(),
  });
  if (error) {
    console.error("[feedback] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  let photoUrl: string | null = null;
  if (photoPath) {
    const { data } = await supabaseAdmin()
      .storage.from("feedback-photos")
      .createSignedUrl(photoPath, 60 * 60 * 24 * 7);
    photoUrl = data?.signedUrl ?? null;
  }

  await notifyPastoralOfFeedback({
    to: await resolveNotificationRecipients("feedback"),
    rating,
    category,
    ministry,
    name,
    message,
    photoUrl,
  });

  return { ok: true, kind: "feedback" };
}

export async function submitPrayer(input: PrayerInput): Promise<FeedbackResult> {
  if (!input.request?.trim()) return { ok: false, error: "Please share your prayer request." };

  const name = input.name?.trim() || null;
  const contact = input.contact?.trim() || null;
  const request = input.request.trim();
  const visibility = input.visibility === "bishop" ? "bishop" : "pastoral";

  const { error } = await supabaseAdmin().from("prayer_requests").insert({
    name,
    contact,
    request,
    confidential: true,
    prayer_wall: false,
    visibility,
    user_id: await sessionUserId(),
  });
  if (error) {
    console.error("[prayer] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  await notifyPrayerTeam({ name, contact, request, prayerWall: false, visibility });

  return { ok: true, kind: "prayer" };
}
