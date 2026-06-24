import "server-only";
import { findThreadKeyByEmail } from "./agent/thread";
import { sendChatNotification } from "./google-chat";
import { recurrenceLabel } from "./events-occurrence";

const SITE_URL_FALLBACK = "https://tap-hub.nehtemple.org";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || SITE_URL_FALLBACK;
}

export type EventChatSnapshot = {
  id: string;
  slug: string;
  title: string;
  category: string;
  starts_at: string;
  location: string;
  recurrence_kind: "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly";
};

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: "America/Detroit",
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function eventLines(ev: EventChatSnapshot): string {
  const rec = recurrenceLabel(ev.recurrence_kind);
  return [
    `*${ev.title}*`,
    `${fmtWhen(ev.starts_at)} · ${ev.location}`,
    `${ev.category}${rec ? ` · ${rec}` : ""}`,
  ].join("\n");
}

/**
 * Push a "new event needs review" card into each approver's Chat thread.
 * Best-effort: skips silently for approvers who haven't DM'd the bot yet
 * (we don't have their space ID).
 */
export async function pushSubmissionToApprovers(
  event: EventChatSnapshot,
  submitterEmail: string,
  approverEmails: string[],
): Promise<void> {
  const editUrl = `${siteUrl()}/admin/events/${event.id}`;
  const body = `Submitted by *${submitterEmail}*\n\n${eventLines(event)}`;
  await Promise.all(
    approverEmails.map(async (email) => {
      const space = await findThreadKeyByEmail("chat", email);
      if (!space) return;
      await sendChatNotification(space, {
        headline: "📬 New event needs review",
        body,
        ctaLabel: "Review & approve",
        ctaUrl: editUrl,
      });
    }),
  );
}

/** Push an "approved" card into the submitter's Chat thread. */
export async function pushApprovalToSubmitter(
  event: EventChatSnapshot,
  submitterEmail: string,
  approverEmail: string,
): Promise<void> {
  const space = await findThreadKeyByEmail("chat", submitterEmail);
  if (!space) return;
  const publicUrl = `${siteUrl()}/events/${event.slug}`;
  const body = `Approved by *${approverEmail}*\n\n${eventLines(event)}`;
  await sendChatNotification(space, {
    headline: "✅ Your event was approved",
    body,
    ctaLabel: "View public page",
    ctaUrl: publicUrl,
  });
}

/** Push a "revisions requested" card into the submitter's Chat thread. */
export async function pushRejectionToSubmitter(
  event: EventChatSnapshot,
  submitterEmail: string,
  approverEmail: string,
  notes: string,
): Promise<void> {
  const space = await findThreadKeyByEmail("chat", submitterEmail);
  if (!space) return;
  const editUrl = `${siteUrl()}/admin/events/${event.id}`;
  const body = [
    `Reviewed by *${approverEmail}*`,
    "",
    eventLines(event),
    "",
    "*Notes:*",
    notes,
  ].join("\n");
  await sendChatNotification(space, {
    headline: "✏️ Event needs revisions",
    body,
    ctaLabel: "Edit & resubmit",
    ctaUrl: editUrl,
  });
}

// ----------------------------------------------------------------------
// Announcement notifications (mirror the event-flow helpers above).
// ----------------------------------------------------------------------

export type AnnouncementChatSnapshot = {
  id: string;
  category: "Ministry" | "Facilities" | "Event";
  title: string;
  date_label: string | null;
};

function announcementLines(a: AnnouncementChatSnapshot): string {
  return [
    `*${a.title}*`,
    a.date_label ?? "",
    `${a.category}`,
  ]
    .filter(Boolean)
    .join("\n");
}

export async function pushAnnouncementSubmissionToApprovers(
  a: AnnouncementChatSnapshot,
  submitterEmail: string,
  approverEmails: string[],
): Promise<void> {
  const editUrl = `${siteUrl()}/admin/announcements/${a.id}`;
  const body = `Submitted by *${submitterEmail}*\n\n${announcementLines(a)}`;
  await Promise.all(
    approverEmails.map(async (email) => {
      const space = await findThreadKeyByEmail("chat", email);
      if (!space) return;
      await sendChatNotification(space, {
        headline: "📬 New announcement needs review",
        body,
        ctaLabel: "Review & approve",
        ctaUrl: editUrl,
      });
    }),
  );
}

export async function pushAnnouncementApprovalToSubmitter(
  a: AnnouncementChatSnapshot,
  submitterEmail: string,
  approverEmail: string,
): Promise<void> {
  const space = await findThreadKeyByEmail("chat", submitterEmail);
  if (!space) return;
  const publicUrl = `${siteUrl()}/announcements`;
  const body = `Approved by *${approverEmail}*\n\n${announcementLines(a)}`;
  await sendChatNotification(space, {
    headline: "✅ Your announcement was approved",
    body,
    ctaLabel: "View public page",
    ctaUrl: publicUrl,
  });
}

export async function pushAnnouncementRejectionToSubmitter(
  a: AnnouncementChatSnapshot,
  submitterEmail: string,
  approverEmail: string,
  notes: string,
): Promise<void> {
  const space = await findThreadKeyByEmail("chat", submitterEmail);
  if (!space) return;
  const editUrl = `${siteUrl()}/admin/announcements/${a.id}`;
  const body = [
    `Reviewed by *${approverEmail}*`,
    "",
    announcementLines(a),
    "",
    "*Notes:*",
    notes,
  ].join("\n");
  await sendChatNotification(space, {
    headline: "✏️ Announcement needs revisions",
    body,
    ctaLabel: "Edit & resubmit",
    ctaUrl: editUrl,
  });
}
