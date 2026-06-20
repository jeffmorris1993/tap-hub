import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_SUBMIT_FROM = "TapHub Events <events@nehtemple.org>";
const DEFAULT_RESPONSE_FROM = "TapHub Events <events@nehtemple.org>";

export type EventSnapshot = {
  id: string;
  slug: string;
  title: string;
  category: string;
  starts_at: string;
  location: string;
  description_long: string;
  recurrence_label: string;
};

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function commonFields(ev: EventSnapshot, extra: Field[] = []): Field[] {
  return [
    { label: "Event", value: ev.title },
    { label: "When", value: fmtDate(ev.starts_at) },
    { label: "Where", value: ev.location },
    { label: "Category", value: ev.category },
    { label: "Recurrence", value: ev.recurrence_label || "One-off" },
    ...extra,
  ];
}

async function send(opts: { from: string; to: string | string[]; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[event-approval] RESEND_API_KEY not set — skipping send.");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send(opts);
    if (error) console.error("[event-approval] resend error", error, "to:", opts.to);
  } catch (err) {
    console.error("[event-approval] send failed", err);
  }
}

export async function notifyApproversOfSubmission(
  event: EventSnapshot,
  submittedBy: string,
  approverEmails: string[],
): Promise<void> {
  if (approverEmails.length === 0) return;
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_SUBMIT_FROM;
  const editHref = `${siteUrl()}/admin/events/${event.id}`;
  const queueHref = `${siteUrl()}/admin/events/pending`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Awaiting Your Approval",
    headline: "New event needs review",
    intro: `${submittedBy} just submitted an event for your approval. Tap below to review the details and approve or reject it.`,
    fields: commonFields(event, [
      { label: "Description", value: event.description_long },
      { label: "Submitted by", value: submittedBy },
    ]),
    cta: { label: "Open in admin", href: editHref },
    footnote: `You can also see everything waiting in the approval queue: ${queueHref}`,
  });

  const text = [
    "A new event has been submitted for your approval through TapHub.",
    "",
    `Title:     ${event.title}`,
    `When:      ${fmtDate(event.starts_at)}`,
    `Where:     ${event.location}`,
    `Category:  ${event.category}`,
    `Recurrence: ${event.recurrence_label || "One-off"}`,
    `Submitted: ${submittedBy}`,
    "",
    "Description:",
    event.description_long,
    "",
    `Open in admin: ${editHref}`,
    `Pending queue: ${queueHref}`,
  ].join("\n");

  await send({
    from,
    to: approverEmails,
    subject: `New event needs review — ${event.title}`,
    html,
    text,
  });
}

export async function notifySubmitterOfApproval(
  event: EventSnapshot,
  submittedBy: string,
  reviewedBy: string,
): Promise<void> {
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_RESPONSE_FROM;
  const publicHref = `${siteUrl()}/events/${event.slug}`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Event Approved",
    headline: "Your event is approved",
    intro: `${reviewedBy} approved your submission. It's now live on the TapHub events page.`,
    fields: commonFields(event),
    cta: { label: "View public page", href: publicHref },
  });

  const text = [
    `${reviewedBy} approved your event submission. It's now live.`,
    "",
    `Title: ${event.title}`,
    `When:  ${fmtDate(event.starts_at)}`,
    `Where: ${event.location}`,
    "",
    `View public page: ${publicHref}`,
  ].join("\n");

  await send({
    from,
    to: submittedBy,
    subject: `Approved — ${event.title}`,
    html,
    text,
  });
}

export async function notifySubmitterOfRejection(
  event: EventSnapshot,
  submittedBy: string,
  reviewedBy: string,
  notes: string,
): Promise<void> {
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_RESPONSE_FROM;
  const editHref = `${siteUrl()}/admin/events/${event.id}`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Revisions Requested",
    headline: "Your event needs revisions",
    intro: `${reviewedBy} reviewed your submission and asked for some changes before it can be published.`,
    notice: { variant: "highlight", text: notes || "(No additional notes provided.)" },
    fields: commonFields(event),
    cta: { label: "Edit and resubmit", href: editHref },
    footnote: "Make the requested changes in the admin, then click \"Submit for approval\" again.",
  });

  const text = [
    `${reviewedBy} asked for some changes before your event can be published.`,
    "",
    "Their notes:",
    notes || "(No additional notes provided.)",
    "",
    `Title: ${event.title}`,
    `When:  ${fmtDate(event.starts_at)}`,
    `Where: ${event.location}`,
    "",
    `Edit and resubmit: ${editHref}`,
  ].join("\n");

  await send({
    from,
    to: submittedBy,
    subject: `Revisions requested — ${event.title}`,
    html,
    text,
  });
}
