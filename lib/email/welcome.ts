import "server-only";
import { Resend } from "resend";

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

  const firstTimeLine =
    payload.firstTime === true ? "Yes" : payload.firstTime === false ? "No (been before)" : "(not answered)";
  const interestsLine = payload.interests.length ? payload.interests.join(", ") : "(none selected)";

  const subject = payload.firstTime
    ? `New first-time visitor — ${payload.name}`
    : `New connect card — ${payload.name}`;

  const text = [
    "A new I'm New Here submission has been received through TapHub.",
    "",
    `Name:        ${payload.name}`,
    `Email:       ${payload.email ?? "(none shared)"}`,
    `Phone:       ${payload.phone ?? "(none shared)"}`,
    `First time:  ${firstTimeLine}`,
    `Interests:   ${interestsLine}`,
    "",
    "—",
    "The full record is also in the admin inbox.",
  ].join("\n");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) console.error("[welcome-routing] resend error", error);
  } catch (err) {
    console.error("[welcome-routing] send failed", err);
  }
}
