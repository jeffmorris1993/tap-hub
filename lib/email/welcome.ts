import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "NT Gateway Welcome <onboarding@resend.dev>";

export type WelcomeEmailPayload = {
  name: string;
  email: string | null;
  phone: string | null;
  firstTime: boolean | null;
  interests: string[];
  /**
   * Set when the guest came through check-in rather than the "I'm New Here"
   * page, so the welcome team knows which service to follow up about.
   */
  checkin?: { serviceName: string; dateLabel: string; timeLabel: string };
  /**
   * True when the guest gave contact details but declined to be contacted —
   * the details are deliberately withheld from this email.
   */
  contactWithheld?: boolean;
};

/**
 * Fire-and-forget notify the welcome team about a new guest — either an
 * "I'm New Here" submission or a guest checking in at a service. Failures
 * are logged but swallowed — the Supabase row is the source of truth.
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
  const viaCheckin = payload.checkin;

  const subject = viaCheckin
    ? isFirstTime
      ? `First-time guest checked in — ${payload.name}`
      : `Returning guest checked in — ${payload.name}`
    : isFirstTime
      ? `New first-time visitor — ${payload.name}`
      : `New connect card — ${payload.name}`;

  const fields: Field[] = [
    { label: "Name", value: payload.name },
    { label: "Email", value: payload.email },
    { label: "Phone", value: payload.phone },
    { label: "First time?", value: firstTimeLabel },
    { label: "Wants to learn about", value: interestsValue },
  ];
  if (viaCheckin) {
    fields.splice(1, 0, {
      label: "Checked in at",
      value: `${viaCheckin.serviceName} · ${viaCheckin.dateLabel} · ${viaCheckin.timeLabel}`,
    });
  }

  const ctaLabel = "Open admin inbox";
  const ctaHref = `${siteUrl()}/portal/submissions?tab=visitors`;

  const headline = viaCheckin
    ? isFirstTime
      ? "First-time guest checked in"
      : "Returning guest checked in"
    : isFirstTime
      ? "New first-time visitor"
      : "New connect card";

  const intro = viaCheckin
    ? isFirstTime
      ? `${payload.name} just checked in at ${viaCheckin.serviceName} for the first time. A quick reach-out from the welcome team this week would mean a lot.`
      : `${payload.name} checked in again at ${viaCheckin.serviceName}. Here's what they shared with us.`
    : isFirstTime
      ? "Someone just filled out the I'm New Here card and said it's their first time. A quick reach-out from the welcome team this week would mean a lot."
      : "Someone just shared their info through I'm New Here. Here's what they told us.";

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · NT Gateway Welcome",
    headline,
    intro,
    notice: payload.contactWithheld
      ? {
          variant: "info",
          text: "They asked not to be contacted, so their phone and email are withheld here. Welcome them in person.",
        }
      : payload.email || payload.phone
        ? undefined
        : { variant: "info", text: "Heads up — they didn't share contact info, so following up directly isn't possible." },
    fields,
    cta: { label: ctaLabel, href: ctaHref },
    footnote: "The full record is also saved in the NT Gateway admin inbox.",
  });

  const textLines = [
    viaCheckin
      ? `A guest just checked in at ${viaCheckin.serviceName}.`
      : "A new I'm New Here submission has been received through NT Gateway.",
    "",
    `Name:        ${payload.name}`,
    ...(viaCheckin
      ? [`Checked in:  ${viaCheckin.serviceName} · ${viaCheckin.dateLabel} · ${viaCheckin.timeLabel}`]
      : []),
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
