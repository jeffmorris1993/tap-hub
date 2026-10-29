"use server";

import { supabaseAdmin } from "../../lib/supabase/server";
import { supabaseSession } from "../../lib/supabase/auth";
import {
  notifyPastorOffice,
  sendPastorMeetingConfirmation,
} from "../../lib/email/pastor-meeting";

const MAX_NAME = 120;
const MAX_CONTACT = 160;
const MAX_DETAILS = 4000;

export type PastorMeetingSubmission = {
  name: string;
  phone: string;
  email: string;
  details: string;
};

export type PastorMeetingResult =
  | { ok: true; firstName: string }
  | { ok: false; error: string };

export async function submitPastorMeeting(
  input: PastorMeetingSubmission,
): Promise<PastorMeetingResult> {
  if (!input.name?.trim()) return { ok: false, error: "Please enter your name." };
  if (!input.phone?.trim() && !input.email?.trim()) {
    return { ok: false, error: "Please add a phone number or email so we can reach you." };
  }
  if (!input.details?.trim()) {
    return {
      ok: false,
      error: "Please tell us a little about what you would like to meet about.",
    };
  }

  const name = input.name.trim().slice(0, MAX_NAME);
  const phone = input.phone?.trim().slice(0, MAX_CONTACT) || null;
  const email = input.email?.trim().slice(0, MAX_CONTACT) || null;
  const details = input.details.trim().slice(0, MAX_DETAILS);

  // Link to the signed-in account when there is one.
  let userId: string | null = null;
  try {
    const session = await supabaseSession();
    const { data } = await session.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // Anonymous submission.
  }

  const { error } = await supabaseAdmin().from("pastor_meeting_requests").insert({
    name,
    phone,
    email,
    details,
    user_id: userId,
  });
  if (error) {
    console.error("[meet-the-pastor] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  const firstName = (name.split(/\s+/)[0] ?? "friend").slice(0, 40);

  await notifyPastorOffice({ name, phone, email, details });
  await sendPastorMeetingConfirmation({ firstName, email });

  return { ok: true, firstName };
}
