import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "Nehemiah's Temple Pastor's Office <office@nehtemple.org>";
const DEFAULT_OFFICE_EMAIL = "slester@nehtemple.org";

export type PastorMeetingPayload = {
  name: string;
  phone: string | null;
  email: string | null;
  details: string;
};

/**
 * Fire-and-forget notify the Pastor's office about a new meeting request so
 * they can reach out and schedule. Failures are logged but swallowed — the
 * Supabase row is the source of truth.
 */
export async function notifyPastorOffice(payload: PastorMeetingPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.PASTOR_OFFICE_EMAIL?.trim() || DEFAULT_OFFICE_EMAIL;
  if (!apiKey) {
    console.warn("[pastor-meeting] office notify skipped: RESEND_API_KEY not set");
    return;
  }
  const from = process.env.PASTOR_OFFICE_FROM || DEFAULT_FROM;

  const fields: Field[] = [
    { label: "Name", value: payload.name },
    { label: "Phone", value: payload.phone },
    { label: "Email", value: payload.email },
  ];

  const ctaHref = `${siteUrl()}/portal/submissions?tab=pastor`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Pastor's Office",
    headline: "New meeting request",
    intro:
      "Someone just asked to meet with the Pastor through NT Gateway. Their details are below — please reach out to get a time on the calendar.",
    notice: {
      variant: "highlight",
      text: "Private — the sender was told only the Pastor's office sees this. Please don't share or forward.",
    },
    fields,
    body: { label: "They'd like to meet about", content: payload.details },
    cta: { label: "Open admin inbox", href: ctaHref },
  });

  const textLines = [
    "A new request to meet with the Pastor has been submitted through NT Gateway.",
    "",
    `Name:  ${payload.name}`,
    `Phone: ${payload.phone || "Not shared"}`,
    `Email: ${payload.email || "Not shared"}`,
    "",
    "They'd like to meet about:",
    payload.details,
    "",
    `Open admin inbox: ${ctaHref}`,
    "",
    "—",
    "Private — the sender was told only the Pastor's office sees this.",
  ];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `Meeting request for the Pastor — ${payload.name}`,
      text: textLines.join("\n"),
      html,
    });
    if (error) console.error("[pastor-meeting] resend error", error);
  } catch (err) {
    console.error("[pastor-meeting] office notify failed", err);
  }
}

/**
 * Fire-and-forget confirmation to the person who asked for the meeting,
 * sent only when they shared an email address.
 */
export async function sendPastorMeetingConfirmation(payload: {
  firstName: string;
  email: string | null;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = payload.email?.trim();
  if (!to) return;
  if (!apiKey) {
    console.warn("[pastor-meeting] confirmation skipped: RESEND_API_KEY not set");
    return;
  }
  const from = process.env.PASTOR_OFFICE_FROM || DEFAULT_FROM;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple",
    headline: "We got your request",
    intro: `Thank you, ${payload.firstName}. Someone from the Pastor's office will be in contact with you soon to set up a time to meet.`,
    footnote:
      "You're receiving this because you asked to meet with the Pastor through NT Gateway. If this wasn't you, you can ignore this email.",
  });

  const text = [
    `Thank you, ${payload.firstName}.`,
    "",
    "We received your request to meet with the Pastor. Someone from the Pastor's office will be in contact with you soon to set up a time.",
    "",
    "— Nehemiah's Temple Apostolic Church, via NT Gateway",
  ].join("\n");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "We got your request — Nehemiah's Temple",
      text,
      html,
    });
    if (error) console.error("[pastor-meeting] confirmation resend error", error);
  } catch (err) {
    console.error("[pastor-meeting] confirmation failed", err);
  }
}
