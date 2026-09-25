import "server-only";

import { listApproverEmails } from "./approvers";

/**
 * Who gets prayer-request and feedback notification emails. Pastoral users
 * configure a recipient list per kind at /portal/notifications (stored in
 * notification_routes); an empty or unreadable list falls back to the
 * default so a config problem never swallows a notification.
 */

export const NOTIFICATION_KINDS = ["prayer", "feedback"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

function normalize(emails: string[]): string[] {
  return [...new Set(emails.map((e) => e.trim().toLowerCase()).filter(Boolean))];
}

async function defaultRecipients(kind: NotificationKind): Promise<string[]> {
  const pastoral = await listApproverEmails();
  if (kind === "prayer") {
    const envTo = process.env.PRAYER_TEAM_EMAIL?.trim();
    return normalize([...pastoral, ...(envTo ? [envTo] : [])]);
  }
  return normalize(pastoral);
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
  return defaultRecipients(kind);
}
