"use server";

import { revalidatePath } from "next/cache";
import { assertPastoral } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import {
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "../../../../lib/notification-routes";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type UpdateRouteResult =
  | { ok: true; recipients: string[] }
  | { ok: false; error: string };

export async function updateNotificationRoute(
  kind: NotificationKind,
  recipients: string[],
): Promise<UpdateRouteResult> {
  const actor = await assertPastoral();

  if (!NOTIFICATION_KINDS.includes(kind)) {
    return { ok: false, error: "Unknown notification type." };
  }

  const cleaned = [
    ...new Set(recipients.map((e) => e.trim().toLowerCase()).filter(Boolean)),
  ];
  const invalid = cleaned.find((e) => !EMAIL_RE.test(e));
  if (invalid) {
    return { ok: false, error: `"${invalid}" doesn't look like an email address.` };
  }

  const { error } = await supabaseAdmin().from("notification_routes").upsert({
    kind,
    recipients: cleaned,
    updated_by: actor.email,
    updated_at: new Date().toISOString(),
  });
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/notifications");
  return { ok: true, recipients: cleaned };
}
