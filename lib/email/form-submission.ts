import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";
import type { StoredResponse } from "../event-signup-forms";

const DEFAULT_FROM = "NT Gateway <forms@nehtemple.org>";

export type FormSubmissionPayload = {
  formId: string;
  formTitle: string;
  notifyEmails: string[];
  responses: StoredResponse[];
};

/**
 * Fire-and-forget notify the form's recipients about a new submission.
 * Failures are logged but swallowed — the Supabase row is the source of truth.
 */
export async function notifyFormSubmission(payload: FormSubmissionPayload): Promise<void> {
  const to = payload.notifyEmails.map((e) => e.trim()).filter(Boolean);
  if (to.length === 0) return;
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[form-submission] notify skipped: RESEND_API_KEY not set");
    return;
  }
  const from = process.env.FORMS_FROM || DEFAULT_FROM;

  const fields: Field[] = payload.responses.map((r) => ({
    label: r.label,
    value: Array.isArray(r.value) ? r.value.join(", ") : r.value,
  }));

  // The first answer is usually a name — surface it in the subject line.
  const first = payload.responses[0]?.value;
  const who = typeof first === "string" ? first : null;
  const subject = who
    ? `${payload.formTitle} — response from ${who}`
    : `${payload.formTitle} — new response`;

  const ctaHref = `${siteUrl()}/portal/forms/${payload.formId}`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Forms",
    headline: "New form response",
    intro: `Someone just filled out "${payload.formTitle}" through NT Gateway. Their answers are below.`,
    fields,
    cta: { label: "See all responses", href: ctaHref },
  });

  const textLines = [
    `A new response was submitted to "${payload.formTitle}" through NT Gateway.`,
    "",
    ...payload.responses.map(
      (r) => `${r.label}: ${Array.isArray(r.value) ? r.value.join(", ") : r.value}`,
    ),
    "",
    `See all responses: ${ctaHref}`,
  ];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject,
      text: textLines.join("\n"),
      html,
    });
    if (error) console.error("[form-submission] resend error", error);
  } catch (err) {
    console.error("[form-submission] notify failed", err);
  }
}
