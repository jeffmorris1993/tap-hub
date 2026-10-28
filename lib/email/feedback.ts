import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "NT Gateway Feedback <onboarding@resend.dev>";

export type FeedbackEmailPayload = {
  to: string[];
  rating: number | null;
  category: string;
  ministry: string;
  name: string | null;
  message: string;
  /** 7-day signed URLs to attached photos, when any were uploaded. */
  photoUrls?: string[];
};

/**
 * Fire-and-forget notify the pastoral team (or configured recipients) about
 * new feedback. Failures are logged but never surfaced — the feedback row is
 * already saved in Supabase and remains the source of truth.
 */
export async function notifyPastoralOfFeedback(payload: FeedbackEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || payload.to.length === 0) {
    console.warn("[feedback-email] skipped: RESEND_API_KEY or recipients not set");
    return;
  }
  const from = process.env.FEEDBACK_FROM || DEFAULT_FROM;

  const fromName = payload.name?.trim() || "(anonymous)";
  const subject =
    `New feedback — ${payload.category}` + (payload.rating ? ` (${payload.rating}/5)` : "");

  const fields: Field[] = [
    { label: "From", value: fromName },
    { label: "Rating", value: payload.rating ? `${payload.rating} / 5` : null },
    { label: "Topic", value: payload.category },
    { label: "Ministry", value: payload.ministry },
    {
      label: "Photos",
      value: payload.photoUrls?.length
        ? `${payload.photoUrls.length} attached — view them in the feedback inbox`
        : null,
    },
  ];

  const ctaHref = `${siteUrl()}/portal/submissions?tab=feedback`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Feedback",
    headline: "New feedback received",
    intro: "Someone just shared feedback through NT Gateway.",
    fields,
    body: { label: "Their feedback", content: payload.message },
    cta: { label: "Open feedback inbox", href: ctaHref },
  });

  const textLines = [
    "New feedback has been submitted through NT Gateway.",
    "",
    `From:     ${fromName}`,
    `Rating:   ${payload.rating ? `${payload.rating} / 5` : "Not rated"}`,
    `Topic:    ${payload.category}`,
    `Ministry: ${payload.ministry}`,
    "",
    "Their feedback:",
    payload.message,
    "",
    ...(payload.photoUrls?.length
      ? [
          "Attached photos (links expire in 7 days):",
          ...payload.photoUrls.map((u, i) => `  ${i + 1}. ${u}`),
          "",
        ]
      : []),
    `Open feedback inbox: ${ctaHref}`,
  ];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject,
      text: textLines.join("\n"),
      html,
    });
    if (error) console.error("[feedback-email] resend error", error);
  } catch (err) {
    console.error("[feedback-email] send failed", err);
  }
}
