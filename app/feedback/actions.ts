"use server";

import { supabaseAdmin } from "../../lib/supabase/server";
import { supabaseSession } from "../../lib/supabase/auth";
import { notifyPrayerTeam } from "../../lib/email/prayer";
import { notifyPastoralOfFeedback } from "../../lib/email/feedback";
import { resolveNotificationRecipients } from "../../lib/notification-routes";

/** Feedback arrives as FormData so optional photos can ride along. Fields:
 *  rating, category, name, message, photos (File, repeated, up to 4). */

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

const MAX_PHOTOS = 4;
// Photos are downscaled in the browser before upload; this is a backstop.
// The whole request must stay under Vercel's 4.5 MB body cap.
const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

export async function submitFeedback(form: FormData): Promise<FeedbackResult> {
  const message = String(form.get("message") ?? "").trim();
  if (!message) return { ok: false, error: "Please share a bit about your experience." };

  const category = String(form.get("category") ?? "General");
  const rating = Number(form.get("rating")) || null;
  const name = String(form.get("name") ?? "").trim() || null;
  const ministry = ministryForFeedbackCategory(category);

  // Optional photos → private feedback-photos bucket via the service role.
  const photos = form
    .getAll("photos")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (photos.length > MAX_PHOTOS) {
    return { ok: false, error: `You can attach up to ${MAX_PHOTOS} photos.` };
  }
  const photoPaths: string[] = [];
  for (const photo of photos) {
    if (!photo.type.startsWith("image/")) {
      return { ok: false, error: "Photos must be image files (JPG, PNG, HEIC…)." };
    }
    if (photo.size > MAX_PHOTO_BYTES) {
      return { ok: false, error: "One of those photos is too large — please keep each under 2 MB." };
    }
    const ext = (photo.name.split(".").pop() ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `${crypto.randomUUID()}.${ext || "jpg"}`;
    const { error: uploadError } = await supabaseAdmin()
      .storage.from("feedback-photos")
      .upload(path, photo, { contentType: photo.type });
    if (uploadError) {
      console.error("[feedback] photo upload failed", uploadError);
      if (photoPaths.length > 0) {
        await supabaseAdmin().storage.from("feedback-photos").remove(photoPaths);
      }
      return {
        ok: false,
        error: "We couldn't upload those photos. Try again, or send your feedback without them.",
      };
    }
    photoPaths.push(path);
  }

  const { error } = await supabaseAdmin().from("feedback").insert({
    rating,
    category,
    ministry,
    name,
    message,
    photo_paths: photoPaths,
    user_id: await sessionUserId(),
  });
  if (error) {
    console.error("[feedback] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  let photoUrls: string[] = [];
  if (photoPaths.length > 0) {
    const { data } = await supabaseAdmin()
      .storage.from("feedback-photos")
      .createSignedUrls(photoPaths, 60 * 60 * 24 * 7);
    photoUrls = (data ?? [])
      .map((u) => u.signedUrl)
      .filter((u): u is string => !!u);
  }

  await notifyPastoralOfFeedback({
    to: await resolveNotificationRecipients("feedback"),
    rating,
    category,
    ministry,
    name,
    message,
    photoUrls,
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
