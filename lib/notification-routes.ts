import "server-only";

import { listApproverEmails } from "./approvers";
import { NOTIFICATION_KINDS, type NotificationKind } from "./notification-kinds";

/**
 * Who gets prayer-request, feedback, and check-in summary notification
 * emails. Pastoral users configure a recipient list per kind at
 * /portal/notifications (stored in notification_routes); an empty or
 * unreadable list falls back to the default so a config problem never
 * swallows a notification.
 *
 * The kinds themselves live in ./notification-kinds so the client-side
 * settings UI can import them without pulling this server-only module in.
 * Re-exported here so existing callers keep working unchanged.
 */

export { NOTIFICATION_KINDS };
export type { NotificationKind };

function normalize(emails: string[]): string[] {
  return [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

/**
 * The address of the prayer-team group, when one is configured. Exposed so the
 * settings page can label it as a group rather than listing it as an
 * unexplained extra address.
 */
export function getPrayerTeamEmail(): string | null {
  const value = process.env.PRAYER_TEAM_EMAIL?.trim().toLowerCase();
  return value ? value : null;
}

/**
 * Where a kind's notifications go when nothing is configured: everyone with
 * the pastoral role, plus the env approver list — and, for prayer only, the
 * prayer-team group.
 *
 * Exported so /portal/notifications can show the real list. It used to be
 * private, which is why that page could only show pastoral-role profiles and
 * silently under-reported who receives prayer requests.
 */
export async function getDefaultRecipients(kind: NotificationKind): Promise<string[]> {
  const pastoral = await listApproverEmails();
  if (kind === "prayer") {
    const envTo = getPrayerTeamEmail();
    return normalize([...pastoral, ...(envTo ? [envTo] : [])]);
  }
  return normalize(pastoral);
}

/**
 * Every kind's default in one pass, so the settings page makes a single
 * approver lookup instead of one per kind. Must stay byte-identical to
 * getDefaultRecipients(kind) for each kind — the page shows this to the user as
 * the literal recipient list, so a divergence here is a lie on screen.
 */
export async function getDefaultRecipientsByKind(): Promise<
  Record<NotificationKind, string[]>
> {
  const pastoral = await listApproverEmails();
  const envTo = getPrayerTeamEmail();
  const base = normalize(pastoral);
  return {
    prayer: normalize([...pastoral, ...(envTo ? [envTo] : [])]),
    feedback: base,
    checkin: base,
  };
}

export async function getConfiguredRecipients(kind: NotificationKind): Promise<string[]> {
  const { supabaseAdmin } = await import("./supabase/server");
  const { data, error } = await supabaseAdmin()
    .from("notification_routes")
    .select("recipients")
    .eq("kind", kind)
    .maybeSingle();
  if (error) {
    console.error("[notification-routes] lookup failed", error);
    return [];
  }
  return normalize((data?.recipients ?? []) as string[]);
}

export async function resolveNotificationRecipients(kind: NotificationKind): Promise<string[]> {
  const configured = await getConfiguredRecipients(kind);
  if (configured.length > 0) return configured;
  return getDefaultRecipients(kind);
}
