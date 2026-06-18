"use server";

export type EventSignupInput = {
  slug: string;
  name: string;
  contact: string;
  role: "attendee" | "volunteer";
};

export type EventSignupResult =
  | { ok: true; role: "attendee" | "volunteer" }
  | { ok: false; error: string };

// Phase 2 replaces this with a Supabase insert into `event_signups`.
export async function submitEventSignup(input: EventSignupInput): Promise<EventSignupResult> {
  if (!input.name?.trim()) return { ok: false, error: "Please share your name." };
  if (!input.contact?.trim()) return { ok: false, error: "Email or phone helps us follow up." };
  console.log("[event-signup]", input);
  return { ok: true, role: input.role };
}
