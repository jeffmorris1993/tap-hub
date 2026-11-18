"use server";

import { supabaseAdmin } from "../../../lib/supabase/server";
import { supabaseSession } from "../../../lib/supabase/auth";
import { notifyFormSubmission } from "../../../lib/email/form-submission";
import {
  buildStoredResponses,
  validateAnswers,
  type FieldErrors,
  type SignupAnswers,
} from "../../../lib/event-signup-forms";
import { parseFormFields } from "../../../lib/standalone-forms";

export type StandaloneFormResult =
  | { ok: true }
  | { ok: false; error: string; fieldErrors?: FieldErrors };

export async function submitStandaloneForm(
  formId: string,
  answers: SignupAnswers,
): Promise<StandaloneFormResult> {
  if (typeof formId !== "string" || !formId.trim()) {
    return { ok: false, error: "This form isn't available anymore." };
  }

  const { data: form, error } = await supabaseAdmin()
    .from("forms")
    .select("id, title, fields, notify_emails, open")
    .eq("id", formId)
    .maybeSingle();
  if (error) {
    console.error("[forms] load failed", error);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }
  if (!form) return { ok: false, error: "This form isn't available anymore." };
  if (!form.open) return { ok: false, error: "This form is closed and no longer taking responses." };

  const fields = parseFormFields(form.fields);
  const fieldErrors = validateAnswers(fields, answers ?? {});
  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: "Check the highlighted answers below.", fieldErrors };
  }
  const responses = buildStoredResponses(fields, answers ?? {});
  if (responses.length === 0) {
    return { ok: false, error: "Please fill out the form first." };
  }

  // Link to the signed-in account when there is one.
  let userId: string | null = null;
  try {
    const session = await supabaseSession();
    const { data } = await session.auth.getUser();
    userId = data.user?.id ?? null;
  } catch {
    // Anonymous submission.
  }

  const { error: insertError } = await supabaseAdmin().from("form_submissions").insert({
    form_id: form.id,
    responses,
    user_id: userId,
  });
  if (insertError) {
    console.error("[forms] insert failed", insertError);
    return { ok: false, error: "Something went wrong on our end. Try again in a moment." };
  }

  await notifyFormSubmission({
    formId: form.id,
    formTitle: form.title,
    notifyEmails: (form.notify_emails as string[] | null) ?? [],
    responses,
  });

  return { ok: true };
}
