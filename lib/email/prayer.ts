import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "TapHub Prayer <onboarding@resend.dev>";

export type PrayerEmailPayload = {
  name: string | null;
  contact: string | null;
  request: string;
  prayerWall: boolean;
};

/**
 * Fire-and-forget notify the pastoral team about a confidential prayer
 * request. Failures are logged but never surfaced — the request row is
 * already saved in Supabase and remains the source of truth.
 */
export async function notifyPrayerTeam(payload: PrayerEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.PRAYER_TEAM_EMAIL;
  if (!apiKey || !to) {
    console.warn("[prayer-routing] skipped: RESEND_API_KEY or PRAYER_TEAM_EMAIL not set");
    return;
  }
  const from = process.env.PRAYER_TEAM_FROM || DEFAULT_FROM;

  const fromName = payload.name?.trim() || "(anonymous)";
  const subject = `Confidential prayer request — ${fromName}`;

  const fields: Field[] = [
    { label: "From", value: fromName },
    { label: "Contact", value: payload.contact?.trim() || "Not shared" },
  ];

  const ctaHref = `${siteUrl()}/admin/submissions?tab=prayers`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Pastoral Care",
    headline: "New prayer request",
    intro: "A member of the congregation just shared a confidential prayer request through TapHub.",
    notice: {
      variant: "highlight",
      text: "Confidential — pastoral team only. Please don't share or post.",
    },
    fields,
    body: { label: "Their request", content: payload.request },
    cta: { label: "Open admin inbox", href: ctaHref },
    footnote: '"The prayer of a righteous person is powerful and effective." — James 5:16',
  });

  const textLines = [
    "A new confidential prayer request has been submitted through TapHub.",
    "",
    `From:    ${fromName}`,
    `Contact: ${payload.contact?.trim() || "Not shared"}`,
    "",
    "Request:",
    payload.request,
    "",
    `Open admin inbox: ${ctaHref}`,
    "",
    "—",
    "Confidential — for the pastoral team only.",
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
    if (error) console.error("[prayer-routing] resend error", error);
  } catch (err) {
    console.error("[prayer-routing] send failed", err);
  }
}
