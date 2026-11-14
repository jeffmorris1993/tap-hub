import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";
import { CHURCH_TZ } from "../tz";

const DEFAULT_FROM = "NT Gateway Events <events@nehtemple.org>";

export type FlyerEventSnapshot = {
  id: string;
  slug: string;
  title: string;
  category: string;
  starts_at: string;
  location: string;
};

function fmtWhen(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: CHURCH_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function commonFields(ev: FlyerEventSnapshot, extra: Field[] = []): Field[] {
  return [
    { label: "Event", value: ev.title },
    { label: "When", value: fmtWhen(ev.starts_at) },
    { label: "Where", value: ev.location },
    { label: "Category", value: ev.category },
    ...extra,
  ];
}

async function send(opts: { from: string; to: string | string[]; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[flyer] RESEND_API_KEY not set — skipping send.");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send(opts);
    if (error) console.error("[flyer] resend error", error, "to:", opts.to);
  } catch (err) {
    console.error("[flyer] send failed", err);
  }
}

/** E1/E6 — a flyer needs designing: fired when details are approved on a
 *  requested-flyer event, or when pastors reroute an uploaded flyer to the
 *  design team with notes. */
export async function notifyDesignersOfFlyerRequest(
  ev: FlyerEventSnapshot,
  designerEmails: string[],
  requestedBy: string | null,
  designNotes: string | null,
  opts: { redesign?: boolean } = {},
): Promise<void> {
  if (designerEmails.length === 0) return;
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const queueHref = `${siteUrl()}/portal/flyers`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Design Queue",
    headline: opts.redesign ? `Flyer redesign requested — ${ev.title}` : `Flyer needed — ${ev.title}`,
    intro: opts.redesign
      ? "The pastors reviewed this event's flyer and asked the design team to take it over."
      : "This event's details are approved and it's waiting on a flyer before it can be published.",
    ...(designNotes ? { notice: { variant: "highlight" as const, text: designNotes } } : {}),
    fields: commonFields(ev, requestedBy ? [{ label: "Requested by", value: requestedBy }] : []),
    cta: { label: "Open the design queue", href: queueHref },
    footnote: "Upload the finished flyer there and submit it — the pastors review it before the event goes live.",
  });

  const text = [
    opts.redesign ? `Flyer redesign requested — ${ev.title}` : `Flyer needed — ${ev.title}`,
    "",
    `Event: ${ev.title}`,
    `When:  ${fmtWhen(ev.starts_at)}`,
    `Where: ${ev.location}`,
    ...(requestedBy ? [`Requested by: ${requestedBy}`] : []),
    ...(designNotes ? ["", "Notes:", designNotes] : []),
    "",
    `Design queue: ${queueHref}`,
  ].join("\n");

  await send({
    from,
    to: designerEmails,
    subject: `${opts.redesign ? "Flyer redesign requested" : "Flyer needed"} — ${ev.title}`,
    html,
    text,
  });
}

/** Details approved, but the event is NOT live yet because its flyer is still
 *  in design / missing — so the submitter isn't told "it's live" wrongly. */
export async function notifySubmitterOfApprovalAwaitingFlyer(
  ev: FlyerEventSnapshot,
  submittedBy: string,
  reviewedBy: string,
  flyerRequested: boolean,
): Promise<void> {
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const editHref = `${siteUrl()}/portal/events/${ev.id}`;

  const intro = flyerRequested
    ? `${reviewedBy} approved your event details. The design team has been asked to create the flyer; once it's uploaded and approved, the event publishes automatically.`
    : `${reviewedBy} approved your event details, but it can't be published until a flyer is uploaded and approved.`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Event Approved",
    headline: "Details approved — flyer in progress",
    intro,
    fields: commonFields(ev),
    cta: { label: "View in admin", href: editHref },
  });

  const text = [intro, "", `Event: ${ev.title}`, `When: ${fmtWhen(ev.starts_at)}`, "", `Admin: ${editHref}`].join("\n");

  await send({ from, to: submittedBy, subject: `Details approved — ${ev.title} (flyer in progress)`, html, text });
}

/** E2 — a flyer was submitted for the pastors' review (round 2). */
export async function notifyApproversOfFlyerSubmission(
  ev: FlyerEventSnapshot,
  uploadedBy: string,
  approverEmails: string[],
): Promise<void> {
  if (approverEmails.length === 0) return;
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const reviewHref = `${siteUrl()}/portal/events/${ev.id}`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Awaiting Your Approval",
    headline: `Flyer ready for review — ${ev.title}`,
    intro: `${uploadedBy} submitted a flyer for this event. Approving it publishes the event; rejecting sends your reason back for revisions.`,
    fields: commonFields(ev, [{ label: "Flyer by", value: uploadedBy }]),
    cta: { label: "Review the flyer", href: reviewHref },
  });

  const text = [
    `Flyer ready for review — ${ev.title}`,
    "",
    `Submitted by: ${uploadedBy}`,
    `Review: ${reviewHref}`,
  ].join("\n");

  await send({ from, to: approverEmails, subject: `Flyer ready for review — ${ev.title}`, html, text });
}

/** E3 — flyer approved, event live. */
export async function notifyFlyerApproved(
  ev: FlyerEventSnapshot,
  recipients: string[],
  reviewedBy: string,
): Promise<void> {
  if (recipients.length === 0) return;
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const publicHref = `${siteUrl()}/events/${ev.slug}`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Published",
    headline: `${ev.title} is live with its flyer`,
    intro: `${reviewedBy} approved the flyer. The event is now published with the flyer attached — visitors can view, share, and download it from the event page.`,
    fields: commonFields(ev),
    cta: { label: "View the event", href: publicHref },
  });

  const text = [`${ev.title} is live with its flyer.`, "", `View: ${publicHref}`].join("\n");

  await send({ from, to: recipients, subject: `Published with flyer — ${ev.title}`, html, text });
}

/** E4/E5 — flyer rejected with a reason; goes to whoever should fix it. */
export async function notifyFlyerRejected(
  ev: FlyerEventSnapshot,
  recipients: string[],
  reviewedBy: string,
  notes: string,
  opts: { toDesignQueue?: boolean } = {},
): Promise<void> {
  if (recipients.length === 0) return;
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const fixHref = opts.toDesignQueue ? `${siteUrl()}/portal/flyers` : `${siteUrl()}/portal/events/${ev.id}`;

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Revisions Requested",
    headline: `Flyer needs changes — ${ev.title}`,
    intro: `${reviewedBy} reviewed the flyer and asked for changes before the event can be published.`,
    notice: { variant: "highlight", text: notes },
    fields: commonFields(ev),
    cta: { label: opts.toDesignQueue ? "Open the design queue" : "Upload a revision", href: fixHref },
  });

  const text = [
    `Flyer needs changes — ${ev.title}`,
    "",
    "Notes:",
    notes,
    "",
    `Fix it here: ${fixHref}`,
  ].join("\n");

  await send({ from, to: recipients, subject: `Flyer needs changes — ${ev.title}`, html, text });
}
