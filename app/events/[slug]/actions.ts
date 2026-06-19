"use server";

import { supabaseAdmin } from "../../../lib/supabase/server";

export type EventSignupInput = {
  slug: string;
  name: string;
  contact: string;
  role: "attendee" | "volunteer";
};

export type EventSignupResult =
  | { ok: true; role: "attendee" | "volunteer" }
  | { ok: false; error: string };

export async function submitEventSignup(input: EventSignupInput): Promise<EventSignupResult> {
  if (!input.name?.trim()) return { ok: false, error: "Please share your name." };
  if (!input.contact?.trim()) return { ok: false, error: "Email or phone helps us follow up." };

  const sb = supabaseAdmin();
  const { data: event, error: lookupError } = await sb
    .from("events")
    .select("id, allow_volunteers")
    .eq("slug", input.slug)
    .limit(1);
  if (lookupError) {
    console.error("[event-signup] lookup failed", lookupError);
    return { ok: false, error: "Couldn't find that event. Try again." };
  }
  const row = event?.[0];
  if (!row) return { ok: false, error: "That event no longer exists." };
  if (input.role === "volunteer" && !row.allow_volunteers) {
    return { ok: false, error: "This event isn't accepting volunteers." };
  }

  const { error } = await sb.from("event_signups").insert({
    event_id: row.id,
    name: input.name.trim(),
    contact: input.contact.trim(),
    role: input.role,
  });
  if (error) {
    console.error("[event-signup] insert failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  return { ok: true, role: input.role };
}
