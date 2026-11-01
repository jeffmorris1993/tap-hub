"use server";

import { revalidatePath } from "next/cache";
import { assertPastoral } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import {
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "../../../../lib/notification-kinds";
import { EMAIL_RE } from "../../../../lib/email-typos";

export type RouteDraft = {
  kind: NotificationKind;
  mode: "default" | "custom";
  /** Ignored when mode is "default" — the stored row is always emptied. */
  recipients: string[];
};

export type SaveRoutesResult =
  | { ok: true; saved: Record<NotificationKind, string[]> }
  | { ok: false; error: string };

/**
 * Replaces the routing for every kind in one write.
 *
 * The settings page edits all three kinds as a single draft behind one Save
 * button, so this takes the whole set rather than one kind at a time. The
 * trade-off is last-write-wins: two pastors saving at once means the second
 * overwrites the first's untouched cards. With three rows and a handful of
 * editors that's acceptable; the alternative (per-kind diffing or an
 * updated_at precondition) buys little here.
 *
 * `mode` is sent explicitly rather than inferred from the array, because the
 * server has to be able to tell "use the pastoral default" from "the user
 * emptied a custom list" — see the check below.
 */
export async function saveNotificationRoutes(
  drafts: RouteDraft[],
): Promise<SaveRoutesResult> {
  const actor = await assertPastoral();

  // A full replace needs exactly one entry per kind. A client that's been open
  // since before a kind was added would otherwise silently drop it.
  const byKind = new Map<NotificationKind, RouteDraft>();
  for (const draft of drafts) {
    if (!NOTIFICATION_KINDS.includes(draft.kind)) {
      return { ok: false, error: "Unknown notification type. Reload the page and try again." };
    }
    if (byKind.has(draft.kind)) {
      return { ok: false, error: "Duplicate notification type. Reload the page and try again." };
    }
    byKind.set(draft.kind, draft);
  }
  if (byKind.size !== NOTIFICATION_KINDS.length) {
    return { ok: false, error: "Some settings were missing. Reload the page and try again." };
  }

  const saved = {} as Record<NotificationKind, string[]>;

  for (const kind of NOTIFICATION_KINDS) {
    const draft = byKind.get(kind)!;

    // "Pastoral team" stores an empty list and discards whatever the client
    // sent, so a default row can never carry stale addresses.
    if (draft.mode === "default") {
      saved[kind] = [];
      continue;
    }

    const cleaned = [
      ...new Set(draft.recipients.map((e) => e.trim().toLowerCase()).filter(Boolean)),
    ];
    const invalid = cleaned.find((e) => !EMAIL_RE.test(e));
    if (invalid) {
      return { ok: false, error: `"${invalid}" doesn't look like an email address.` };
    }

    // This is the guard, not a duplicate of the client's disabled button.
    //
    // An empty list is how "use the pastoral default" is stored, so a custom
    // list with nobody on it has no representation in the table. Were it
    // allowed through, it would read back as "Pastoral team" and
    // resolveNotificationRecipients would fall back to the default — mailing
    // exactly the people the user was trying to exclude.
    if (cleaned.length === 0) {
      return {
        ok: false,
        error:
          "Pick at least one person, add an email address, or switch back to the Pastoral team.",
      };
    }

    saved[kind] = cleaned;
  }

  const now = new Date().toISOString();
  const { error } = await supabaseAdmin()
    .from("notification_routes")
    .upsert(
      NOTIFICATION_KINDS.map((kind) => ({
        kind,
        recipients: saved[kind],
        updated_by: actor.email,
        updated_at: now,
      })),
      { onConflict: "kind" },
    );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/notifications");
  return { ok: true, saved };
}
