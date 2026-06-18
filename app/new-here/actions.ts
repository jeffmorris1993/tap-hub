"use server";

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

// Phase 2 replaces this with a Supabase insert + welcome routing.
export async function submitNewHere(input: NewHereSubmission): Promise<NewHereResult> {
  if (!input.name?.trim()) return { ok: false, error: "Please share your name." };
  if (!input.email?.trim() && !input.phone?.trim()) {
    return { ok: false, error: "Email or phone helps us follow up." };
  }
  // TODO(phase-2): insert into Supabase `visitors`.
  console.log("[new-here]", input);
  const firstName = (input.name.trim().split(/\s+/)[0] ?? "friend").slice(0, 40);
  return { ok: true, firstName };
}
