import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "TapHub Ignite <onboarding@resend.dev>";

export type IgniteParentEmailPayload = {
  guardianName: string;
  childCount: number;
  /** 'yes' | 'maybe' | 'not_now' | '' */
  volunteerInterest: string;
};

const VOLUNTEER_LABEL: Record<string, string> = {
  yes: "Yes",
  maybe: "Maybe, depending on the opportunity",
  not_now: "Not at this time",
};

/**
 * Fire-and-forget heads-up that a family submitted the parent update form.
 *
 * This deliberately carries NO child information — no names, dates of birth,
 * grades, or answers. The submission concerns minors, so the details stay in
 * the admin inbox behind authentication rather than travelling by email.
 * Failures are logged but swallowed; the Supabase rows are the source of truth.
 */
export async function notifyIgniteTeam(payload: IgniteParentEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.IGNITE_TEAM_EMAIL;
  if (!apiKey || !to) {
    console.warn("[ignite-parent] skipped: RESEND_API_KEY or IGNITE_TEAM_EMAIL not set");
    return;
  }
  const from = process.env.IGNITE_TEAM_FROM || DEFAULT_FROM;

  const childLabel = payload.childCount === 1 ? "1 child" : `${payload.childCount} children`;
  const volunteerLabel = VOLUNTEER_LABEL[payload.volunteerInterest] ?? "Not answered";
  const ctaHref = `${siteUrl()}/admin/submissions?tab=ignite`;

  const fields: Field[] = [
    { label: "Family", value: payload.guardianName },
    { label: "Children listed", value: childLabel },
    { label: "Interested in helping in 2027", value: volunteerLabel },
  ];

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Ignite Youth",
    headline: "New parent update",
    intro:
      "A family just completed the Ignite Youth parent & family update form as we prepare for 2027.",
    notice: {
      variant: "info",
      text: "Child details aren't included in this email. Open the admin inbox to see the full submission.",
    },
    fields,
    cta: { label: "Open admin inbox", href: ctaHref },
    footnote: "You can export the family list and youth roster from the same page.",
  });

  const textLines = [
    "A family just completed the Ignite Youth parent & family update form.",
    "",
    `Family:      ${payload.guardianName}`,
    `Children:    ${childLabel}`,
    `Helping:     ${volunteerLabel}`,
    "",
    "Child details aren't included in this email.",
    `Open admin inbox: ${ctaHref}`,
  ];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: `New Ignite parent update — ${payload.guardianName}`,
      text: textLines.join("\n"),
      html,
    });
    if (error) console.error("[ignite-parent] resend error", error);
  } catch (err) {
    console.error("[ignite-parent] send failed", err);
  }
}
