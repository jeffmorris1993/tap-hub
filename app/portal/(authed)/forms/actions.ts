"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { assertLead } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { normalizeEmails } from "../../../../lib/event-notify";
import type { SignupField } from "../../../../lib/event-signup-forms";
import {
  MAX_FORM_INTRO,
  MAX_FORM_TITLE,
  MAX_NOTIFY_EMAILS,
  parseFormFields,
  validateFormFieldConfig,
} from "../../../../lib/standalone-forms";

export type FormActionResult = { ok: true; id?: string } | { ok: false; error: string };

export type CreateFormInput = {
  title: string;
  intro: string;
  fields: SignupField[];
  /** Free-text box: addresses separated by newlines/commas/semicolons. */
  notifyEmailsRaw: string;
};

export async function createForm(input: CreateFormInput): Promise<FormActionResult> {
  const pu = await assertLead();

  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Give the form a title." };
  if (title.length > MAX_FORM_TITLE) {
    return { ok: false, error: `Keep the title under ${MAX_FORM_TITLE} characters.` };
  }
  const intro = input.intro?.trim().slice(0, MAX_FORM_INTRO) || null;

  const configProblem = validateFormFieldConfig(input.fields);
  if (configProblem) return { ok: false, error: configProblem };
  const fields = parseFormFields(input.fields);
  if (fields.length === 0) return { ok: false, error: "Add at least one question." };

  const notifyEmails = normalizeEmails((input.notifyEmailsRaw ?? "").split(/[\n,;]+/));
  if (notifyEmails.length === 0) {
    return { ok: false, error: "Add at least one email address to send responses to." };
  }
  if (notifyEmails.length > MAX_NOTIFY_EMAILS) {
    return { ok: false, error: `Keep it to ${MAX_NOTIFY_EMAILS} notification emails or fewer.` };
  }

  const slug = randomBytes(8).toString("hex");
  const { data, error } = await supabaseAdmin()
    .from("forms")
    .insert({
      slug,
      title,
      intro,
      fields,
      notify_emails: notifyEmails,
      created_by: pu.email,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[forms] create failed", error);
    return { ok: false, error: "Couldn't create the form. Try again in a moment." };
  }

  revalidatePath("/portal/forms");
  return { ok: true, id: data.id as string };
}

export async function setFormOpen(id: string, open: boolean): Promise<FormActionResult> {
  await assertLead();
  const { error } = await supabaseAdmin()
    .from("forms")
    .update({ open: open === true })
    .eq("id", id);
  if (error) {
    console.error("[forms] open toggle failed", error);
    return { ok: false, error: "Couldn't update the form. Try again in a moment." };
  }
  revalidatePath("/portal/forms");
  revalidatePath(`/portal/forms/${id}`);
  return { ok: true };
}

/** Deletes the form and (via cascade) every submission. */
export async function deleteForm(id: string): Promise<FormActionResult> {
  await assertLead();
  const { error } = await supabaseAdmin().from("forms").delete().eq("id", id);
  if (error) {
    console.error("[forms] delete failed", error);
    return { ok: false, error: "Couldn't delete the form. Try again in a moment." };
  }
  revalidatePath("/portal/forms");
  return { ok: true };
}
