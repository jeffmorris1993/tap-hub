import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";
import {
  ATTENDANCE_LABEL,
  type Attendance,
  type SignupRole,
  type StoredResponse,
} from "../event-signup-forms";

const DEFAULT_FROM = "TapHub Events <onboarding@resend.dev>";

const ROLE_LABEL: Record<SignupRole, string> = {
  attendee: "Attending",
  volunteer: "Volunteering",
};

export type SignupEmailPayload = {
  to: string[];
  event: { id: string; title: string };
  signup: {
    name: string;
    contact: string;
    roles: SignupRole[];
    attendance: Attendance | null;
    /** Detroit calendar date (YYYY-MM-DD) for recurring series, else null. */
    occurrenceDate: string | null;
    notes: string | null;
    responses: { role: SignupRole; items: StoredResponse[] }[];
  };
};

/** "2026-10-03" → "Fri, Oct 3, 2026" without timezone day-shift. */
function fmtDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function answerText(value: string | string[]): string {
  return Array.isArray(value) ? value.join(", ") : value;
}

/**
 * Fire-and-forget notify the event's organizer that someone signed up.
 * Failures are logged but never surfaced — the signup rows are already in
 * Supabase and remain the source of truth.
 */
export async function notifyOrganizerOfSignup(payload: SignupEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || payload.to.length === 0) {
    console.warn("[event-signup-email] skipped: RESEND_API_KEY or recipients not set");
    return;
  }
  const from = process.env.EVENT_SIGNUP_FROM || DEFAULT_FROM;
  const { event, signup } = payload;

  const roleLabel = signup.roles.map((r) => ROLE_LABEL[r]).join(" + ");
  // Prefix custom-question labels with the role only when both roles answered
  // questions, so a single-role signup reads cleanly.
  const answeredRoles = signup.responses.filter((r) => r.items.length > 0);
  const prefixRole = answeredRoles.length > 1;

  const fields: Field[] = [
    { label: "Name", value: signup.name },
    { label: "Contact", value: signup.contact },
    { label: "Role(s)", value: roleLabel },
    {
      label: "Attending for sure?",
      value: signup.attendance ? ATTENDANCE_LABEL[signup.attendance] : null,
    },
    { label: "Date", value: signup.occurrenceDate ? fmtDay(signup.occurrenceDate) : null },
    { label: "Notes", value: signup.notes },
  ];
  for (const group of answeredRoles) {
    for (const item of group.items) {
      fields.push({
        label: prefixRole ? `${ROLE_LABEL[group.role]} — ${item.label}` : item.label,
        value: answerText(item.value),
      });
    }
  }

  const ctaHref = `${siteUrl()}/portal/events/${event.id}`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Event Signup",
    headline: "Someone just signed up",
    intro: `${signup.name} signed up for ${event.title}.`,
    fields,
    cta: { label: "View all signups", href: ctaHref },
  });

  const textLines = [
    `${signup.name} signed up for ${event.title}.`,
    "",
    ...fields
      .filter((f) => f.value != null && String(f.value).trim() !== "")
      .map((f) => `${f.label}: ${f.value}`),
    "",
    `View all signups: ${ctaHref}`,
  ];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: `New signup — ${signup.name} · ${event.title}`,
      text: textLines.join("\n"),
      html,
    });
    if (error) console.error("[event-signup-email] resend error", error);
  } catch (err) {
    console.error("[event-signup-email] send failed", err);
  }
}
