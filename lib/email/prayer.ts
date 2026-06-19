import "server-only";
import { Resend } from "resend";

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

  const name = payload.name?.trim() || "(anonymous)";
  const contact = payload.contact?.trim() || "(none shared)";
  const wall = payload.prayerWall ? "Yes" : "No";

  const subject = `Confidential prayer request — ${name}`;
  const text = [
    "A new confidential prayer request has been submitted through TapHub.",
    "",
    `From:        ${name}`,
    `Contact:     ${contact}`,
    `Prayer wall: ${wall}`,
    "",
    "Request:",
    payload.request,
    "",
    "—",
    "This is for the pastoral team only. The full record is also in the admin inbox.",
  ].join("\n");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({ from, to, subject, text });
    if (error) console.error("[prayer-routing] resend error", error);
  } catch (err) {
    console.error("[prayer-routing] send failed", err);
  }
}
