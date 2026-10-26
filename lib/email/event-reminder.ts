import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";
import type { SignupRole } from "../event-signup-forms";

const DEFAULT_FROM = "NT Gateway Events <onboarding@resend.dev>";

const ROLE_LABEL: Record<SignupRole, string> = {
  attendee: "Attending",
  volunteer: "Volunteering",
};

export type ReminderEmailPayload = {
  to: string;
  event: { slug: string; title: string; location: string };
  signup: { name: string; role: SignupRole };
  /** Detroit calendar date (YYYY-MM-DD) of the occurrence. */
  occurrenceDate: string;
  /** Human-readable when text ("Sat, Oct 24 · 12:00 PM"). */
  whenText: string;
};

/**
 * One reminder per signup per occurrence, sent by the hourly cron. Returns
 * true when the send was handed to Resend without error so the caller can
 * log it in event_reminder_sends.
 */
export async function sendEventReminder(payload: ReminderEmailPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !payload.to) return false;
  const from = process.env.EVENT_SIGNUP_FROM || DEFAULT_FROM;
  const { event, signup } = payload;

  const eventHref = `${siteUrl()}/events/${event.slug}?date=${payload.occurrenceDate}`;

  const fields: Field[] = [
    { label: "Event", value: event.title },
    { label: "When", value: payload.whenText },
    { label: "Where", value: event.location },
    { label: "You're", value: ROLE_LABEL[signup.role] },
  ];

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Events",
    headline: "See you soon!",
    intro: `Hi ${signup.name} — a quick reminder that ${event.title} is coming up.`,
    fields,
    cta: { label: "View event details", href: eventHref },
    footnote: "Plans changed? Reply to this email or reach out to the church office.",
  });

  const textLines = [
    `Reminder: ${event.title} is coming up.`,
    "",
    ...fields
      .filter((f) => f.value != null && String(f.value).trim() !== "")
      .map((f) => `${f.label}: ${f.value}`),
    "",
    `Event details: ${eventHref}`,
  ];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: [payload.to],
      subject: `Reminder — ${event.title}`,
      text: textLines.join("\n"),
      html,
    });
    if (error) {
      console.error("[event-reminder] resend error", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[event-reminder] send failed", err);
    return false;
  }
}
