import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "Nehemiah's Temple Attendance <attendance@nehtemple.org>";

export type CheckinSummaryPayload = {
  to: string[];
  serviceName: string;
  /** Detroit calendar date (YYYY-MM-DD) of the occurrence. */
  occurrenceDate: string;
  /** Human-readable date ("Sun, Oct 25"). */
  dateLabel: string;
  /** Service start time label ("12:00 PM"). */
  serviceTimeLabel: string;
  kpis: { total: number; members: number; regulars: number; first: number; returning: number };
};

/**
 * One metrics email per service occurrence, sent by the checkin-summary cron
 * once the window closes. Returns true when the send was handed to Resend
 * without error so the caller can log it in checkin_summary_sends.
 */
export async function sendCheckinSummary(payload: CheckinSummaryPayload): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || payload.to.length === 0) return false;
  const from = process.env.ATTENDANCE_FROM || DEFAULT_FROM;
  const { kpis } = payload;

  const attendanceHref = `${siteUrl()}/portal/attendance`;

  // Same labels as the portal attendance overview tiles.
  const fields: Field[] = [
    { label: "Service", value: `${payload.serviceName} · ${payload.dateLabel} · ${payload.serviceTimeLabel}` },
    { label: "Total check-ins", value: String(kpis.total) },
    { label: "Members", value: String(kpis.members) },
    { label: "Regular attendees", value: String(kpis.regulars) },
    { label: "First-time guests", value: String(kpis.first) },
    { label: "Returning guests", value: String(kpis.returning) },
  ];

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Attendance",
    headline: payload.serviceName,
    intro: `Check-in closed for ${payload.dateLabel}. Here's how attendance looked.`,
    fields,
    cta: { label: "Open the attendance dashboard", href: attendanceHref },
    footnote: "You're receiving this because you're on the check-in summary list (Portal → Notifications).",
  });

  const textLines = [
    `Check-in closed — ${payload.serviceName}, ${payload.dateLabel}.`,
    "",
    ...fields.map((f) => `${f.label}: ${f.value}`),
    "",
    `Attendance dashboard: ${attendanceHref}`,
  ];

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: payload.to,
      subject: `Check-in summary — ${payload.serviceName}, ${payload.dateLabel}`,
      text: textLines.join("\n"),
      html,
    });
    if (error) {
      console.error("[checkin-summary] resend error", error);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[checkin-summary] send failed", err);
    return false;
  }
}
