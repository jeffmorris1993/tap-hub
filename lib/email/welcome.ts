import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "TapHub Welcome <onboarding@resend.dev>";

export type WelcomeEmailPayload = {
  name: string;
  email: string | null;
  phone: string | null;
  firstTime: boolean | null;
  interests: string[];
};

/**
 * Fire-and-forget notify the welcome team about a new "I'm New Here"
 * submission. Failures are logged but swallowed — the Supabase row is
 * the source of truth.
 */
export async function notifyWelcomeTeam(payload: WelcomeEmailPayload): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.WELCOME_TEAM_EMAIL;
  if (!apiKey || !to) {
    console.warn("[welcome-routing] skipped: RESEND_API_KEY or WELCOME_TEAM_EMAIL not set");
    return;
  }
  const from = process.env.WELCOME_TEAM_FROM || DEFAULT_FROM;

  const isFirstTime = payload.firstTime === true;
  const firstTimeLabel =
    payload.firstTime === true
      ? "Yes — first time"
      : payload.firstTime === false
        ? "No — been before"
        : "Not answered";
  const interestsValue = payload.interests.length ? payload.interests.join(", ") : null;

  const subject = isFirstTime
    ? `New first-time visitor — ${payload.name}`
    : `New connect card — ${payload.name}`;

  const fields: Field[] = [
    { label: "Name", value: payload.name },
    { label: "Email", value: payload.email },
    { label: "Phone", value: payload.phone },
    { label: "First time?", value: firstTimeLabel },
    { label: "Wants to learn about", value: interestsValue },
  ];

  const ctaLabel = "Open admin inbox";
  const ctaHref = `${siteUrl()}/admin/submissions?tab=visitors`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · TapHub Welcome",
    headline: isFirstTime ? "New first-time visitor" : "New connect card",
    intro: isFirstTime
      ? "Someone just filled out the I'm New Here card and said it's their first time. A quick reach-out from the welcome team this week would mean a lot."
      : "Someone just shared their info through I'm New Here. Here's what they told us.",
    notice: payload.email || payload.phone
      ? undefined
      : { variant: "info", text: "Heads up — they didn't share contact info, so following up directly isn't possible." },
    fields,
    cta: { label: ctaLabel, href: ctaHref },
    footnote: "The full record is also saved in the TapHub admin inbox.",
  });

  const textLines = [
    "A new I'm New Here submission has been received through TapHub.",
    "",
    `Name:        ${payload.name}`,
    `Email:       ${payload.email ?? "(none shared)"}`,
    `Phone:       ${payload.phone ?? "(none shared)"}`,
    `First time:  ${firstTimeLabel}`,
    `Interests:   ${interestsValue ?? "(none selected)"}`,
    "",
    `Open admin inbox: ${ctaHref}`,
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
    if (error) console.error("[welcome-routing] resend error", error);
  } catch (err) {
    console.error("[welcome-routing] send failed", err);
  }
}
