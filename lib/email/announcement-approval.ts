import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "TapHub Announcements <events@nehtemple.org>";

export type AnnouncementSnapshot = {
  id: string;
  category: "Important" | "Ministry" | "Facilities" | "Event";
  title: string;
  body: string;
  date_label: string | null;
};

function commonFields(a: AnnouncementSnapshot, extra: Field[] = []): Field[] {
  return [
    { label: "Title", value: a.title },
    { label: "Category", value: a.category },
    ...(a.date_label ? [{ label: "When", value: a.date_label }] : []),
    { label: "Body", value: a.body },
    ...extra,
  ];
}

async function send(opts: { from: string; to: string | string[]; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[announcement-approval] RESEND_API_KEY not set — skipping send.");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send(opts);
    if (error) console.error("[announcement-approval] resend error", error, "to:", opts.to);
  } catch (err) {
    console.error("[announcement-approval] send failed", err);
  }
}

export async function notifyApproversOfAnnouncementSubmission(
  a: AnnouncementSnapshot,
  submittedBy: string,
  approverEmails: string[],
): Promise<void> {
  if (approverEmails.length === 0) return;
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const editHref = `${siteUrl()}/admin/announcements/${a.id}`;
  const queueHref = `${siteUrl()}/admin/announcements/pending`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Awaiting Your Approval",
    headline: "New announcement needs review",
    intro: `${submittedBy} just submitted an announcement for the public Announcements tab. Review and approve or send back with notes.`,
    fields: commonFields(a, [{ label: "Submitted by", value: submittedBy }]),
    cta: { label: "Open in admin", href: editHref },
    footnote: `See everything waiting: ${queueHref}`,
  });

  const text = [
    "A new announcement has been submitted for your approval through TapHub.",
    "",
    `Title:    ${a.title}`,
    `Category: ${a.category}`,
    ...(a.date_label ? [`When:     ${a.date_label}`] : []),
    `Submitted: ${submittedBy}`,
    "",
    "Body:",
    a.body,
    "",
    `Open in admin: ${editHref}`,
    `Pending queue: ${queueHref}`,
  ].join("\n");

  await send({
    from,
    to: approverEmails,
    subject: `New announcement needs review — ${a.title}`,
    html,
    text,
  });
}

export async function notifySubmitterOfAnnouncementApproval(
  a: AnnouncementSnapshot,
  submittedBy: string,
  reviewedBy: string,
): Promise<void> {
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const publicHref = `${siteUrl()}/announcements`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Announcement Approved",
    headline: "Your announcement is approved",
    intro: `${reviewedBy} approved your submission. It's now live on the TapHub Announcements tab.`,
    fields: commonFields(a),
    cta: { label: "View public page", href: publicHref },
  });

  const text = [
    `${reviewedBy} approved your announcement submission. It's now live.`,
    "",
    `Title:    ${a.title}`,
    `Category: ${a.category}`,
    ...(a.date_label ? [`When:     ${a.date_label}`] : []),
    "",
    `View public page: ${publicHref}`,
  ].join("\n");

  await send({
    from,
    to: submittedBy,
    subject: `Approved — ${a.title}`,
    html,
    text,
  });
}

export async function notifySubmitterOfAnnouncementRejection(
  a: AnnouncementSnapshot,
  submittedBy: string,
  reviewedBy: string,
  notes: string,
): Promise<void> {
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const editHref = `${siteUrl()}/admin/announcements/${a.id}`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Revisions Requested",
    headline: "Your announcement needs revisions",
    intro: `${reviewedBy} reviewed your announcement and asked for some changes before it can be published.`,
    notice: { variant: "highlight", text: notes || "(No additional notes provided.)" },
    fields: commonFields(a),
    cta: { label: "Edit and resubmit", href: editHref },
    footnote: "Make the requested changes in the admin, then click \"Submit for approval\" again.",
  });

  const text = [
    `${reviewedBy} asked for some changes before your announcement can be published.`,
    "",
    "Their notes:",
    notes || "(No additional notes provided.)",
    "",
    `Title:    ${a.title}`,
    `Category: ${a.category}`,
    ...(a.date_label ? [`When:     ${a.date_label}`] : []),
    "",
    `Edit and resubmit: ${editHref}`,
  ].join("\n");

  await send({
    from,
    to: submittedBy,
    subject: `Revisions requested — ${a.title}`,
    html,
    text,
  });
}
