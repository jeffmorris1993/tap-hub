"use server";

import { revalidatePath } from "next/cache";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { can, getPortalUser, type PortalUser } from "../../../../lib/portal-auth";
import { listApproverEmails } from "../../../../lib/approvers";
import { listFlyerDesignerEmails } from "../../../../lib/flyer-designers";
import { normalizeEmails } from "../../../../lib/event-notify";
import { FLYER_BUCKET, type FlyerMode, type FlyerStatus } from "../../../../lib/flyers";
import { syncEventToCalendar } from "../../../../lib/google-calendar";
import {
  notifyApproversOfFlyerSubmission,
  notifyDesignersOfFlyerRequest,
  notifyFlyerApproved,
  notifyFlyerRejected,
  type FlyerEventSnapshot,
} from "../../../../lib/email/flyer";

/**
 * Flyer lifecycle actions. Kept separate from actions.ts because the upload
 * rides FormData (binary file) while the event form's save path is JSON —
 * the same split the feedback form uses.
 */

export type FlyerActionResult = { ok: true; id: string } | { ok: false; error: string };

// Browser-side downscaling keeps files well under this; it's a backstop. The
// whole request must stay under Vercel's 4.5 MB body cap.
const MAX_FLYER_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type FlyerEventRow = FlyerEventSnapshot & {
  approval_status: string;
  published: boolean;
  submitted_by: string | null;
  flyer_mode: FlyerMode;
  flyer_status: FlyerStatus;
  flyer_path: string | null;
  flyer_uploaded_by: string | null;
  flyer_request_notes: string | null;
};

async function loadFlyerEvent(id: string): Promise<FlyerEventRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(
      "id, slug, title, category, starts_at, location, approval_status, published, submitted_by, " +
        "flyer_mode, flyer_status, flyer_path, flyer_uploaded_by, flyer_request_notes",
    )
    .eq("id", id)
    .limit(1);
  if (error || !data?.[0]) return null;
  return data[0] as unknown as FlyerEventRow;
}

/** Designers (flyer capability / pastoral) can touch any event's flyer; event
 *  staff can touch flyers for events in their ministry scope. */
function canTouchFlyer(pu: PortalUser, category: string): boolean {
  if (can(pu, "flyer")) return true;
  if (pu.role === "member") return false;
  return pu.role === "pastoral" || pu.ministries.includes(category);
}

function revalidateFlyerSurfaces(slug?: string) {
  revalidatePath("/events");
  if (slug) revalidatePath(`/events/${slug}`);
  revalidatePath("/portal/events");
  revalidatePath("/portal/events/pending");
  revalidatePath("/portal/flyers");
}

/** Store the file and point the event at it. Does NOT submit for review —
 *  that's the explicit "Submit for approval" tap (so a designer can swap the
 *  file freely before notifying the pastors). Exception: on the creator
 *  upload path (flyer_status 'none') the flyer becomes 'submitted'
 *  immediately, because it will be reviewed together with the event details. */
export async function uploadEventFlyer(form: FormData): Promise<FlyerActionResult> {
  const pu = await getPortalUser();
  if (!pu) return { ok: false, error: "Not authorized." };

  const eventId = String(form.get("eventId") ?? "");
  const file = form.get("file");
  if (!eventId || !(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Choose a flyer image to upload." };
  }

  const ev = await loadFlyerEvent(eventId);
  if (!ev) return { ok: false, error: "Event not found." };
  if (!canTouchFlyer(pu, ev.category)) {
    return { ok: false, error: "You can't manage this event's flyer." };
  }

  const ext = ALLOWED_TYPES[file.type];
  if (!ext) return { ok: false, error: "Flyers must be JPG, PNG, or WebP images." };
  if (file.size > MAX_FLYER_BYTES) {
    return { ok: false, error: "That file is too large — keep the flyer under 4 MB." };
  }

  const path = `${eventId}/${crypto.randomUUID()}.${ext}`;
  const { error: uploadError } = await supabaseAdmin()
    .storage.from(FLYER_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) {
    console.error("[flyers] upload failed", uploadError);
    return { ok: false, error: "We couldn't upload that flyer — please try again." };
  }

  // Creator path: a brand-new flyer on a not-yet-reviewed event is reviewed
  // with the details, so it goes straight to 'submitted'. Designer/revision
  // paths keep their current status until the explicit submit.
  const nextStatus: FlyerStatus = ev.flyer_status === "none" ? "submitted" : ev.flyer_status;

  const { error } = await supabaseAdmin()
    .from("events")
    .update({
      flyer_path: path,
      flyer_uploaded_by: pu.email,
      flyer_status: nextStatus,
      flyer_mode: ev.flyer_mode === "none" ? "uploaded" : ev.flyer_mode,
    })
    .eq("id", eventId);
  if (error) {
    await supabaseAdmin().storage.from(FLYER_BUCKET).remove([path]);
    return { ok: false, error: error.message };
  }

  // Replace, don't accumulate: drop the previous file once the row points
  // at the new one.
  if (ev.flyer_path && ev.flyer_path !== path) {
    await supabaseAdmin().storage.from(FLYER_BUCKET).remove([ev.flyer_path]);
  }

  revalidateFlyerSurfaces(ev.slug);
  return { ok: true, id: eventId };
}

/** The designer's "send it to the pastors" tap: marks the flyer submitted
 *  and notifies the approvers when this is a round-2 review (details already
 *  approved). */
export async function submitFlyerForApproval(eventId: string): Promise<FlyerActionResult> {
  const pu = await getPortalUser();
  if (!pu) return { ok: false, error: "Not authorized." };

  const ev = await loadFlyerEvent(eventId);
  if (!ev) return { ok: false, error: "Event not found." };
  if (!canTouchFlyer(pu, ev.category)) {
    return { ok: false, error: "You can't manage this event's flyer." };
  }
  if (!ev.flyer_path) return { ok: false, error: "Upload the flyer first." };
  if (ev.flyer_status === "approved") return { ok: false, error: "This flyer is already approved." };

  const { error } = await supabaseAdmin()
    .from("events")
    .update({
      flyer_status: "submitted",
      flyer_submitted_at: new Date().toISOString(),
      flyer_notes: null,
    })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  if (ev.approval_status === "approved") {
    const approvers = await listApproverEmails();
    await notifyApproversOfFlyerSubmission(ev, pu.email, approvers);
  }

  revalidateFlyerSurfaces(ev.slug);
  return { ok: true, id: eventId };
}

/** Round 2 approve: flyer approved → if the details are approved too, the
 *  event publishes in the same tap. */
export async function approveEventFlyer(eventId: string): Promise<FlyerActionResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") {
    return { ok: false, error: "Only pastoral leadership can approve flyers." };
  }

  const ev = await loadFlyerEvent(eventId);
  if (!ev) return { ok: false, error: "Event not found." };
  if (!ev.flyer_path) return { ok: false, error: "There's no flyer to approve yet." };

  const publishes = ev.approval_status === "approved";
  const { error } = await supabaseAdmin()
    .from("events")
    .update({
      flyer_status: "approved",
      flyer_notes: null,
      flyer_reviewed_by: pu.email,
      flyer_reviewed_at: new Date().toISOString(),
      ...(publishes ? { published: true } : {}),
    })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  if (publishes) {
    await syncEventToCalendar(eventId);
    const recipients = normalizeEmails([ev.submitted_by, ev.flyer_uploaded_by]).filter(
      (e) => e !== pu.email,
    );
    await notifyFlyerApproved(ev, recipients, pu.email);
  }

  revalidateFlyerSurfaces(ev.slug);
  return { ok: true, id: eventId };
}

/** Round 2 reject: reason required. Either back to whoever uploaded it, or
 *  rerouted to the design team ("send to the design team" checkbox). Event
 *  details stay approved — only publishing is held. */
export async function rejectEventFlyer(
  eventId: string,
  notes: string,
  routeToDesigner: boolean,
): Promise<FlyerActionResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") {
    return { ok: false, error: "Only pastoral leadership can reject flyers." };
  }
  const trimmed = notes.trim();
  if (!trimmed) return { ok: false, error: "Add a short note about what needs to change." };

  const ev = await loadFlyerEvent(eventId);
  if (!ev) return { ok: false, error: "Event not found." };

  const { error } = await supabaseAdmin()
    .from("events")
    .update({
      flyer_status: routeToDesigner ? "awaiting_design" : "rejected",
      ...(routeToDesigner ? { flyer_mode: "requested" } : {}),
      flyer_notes: trimmed,
      flyer_reviewed_by: pu.email,
      flyer_reviewed_at: new Date().toISOString(),
      published: false,
    })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  if (routeToDesigner) {
    const designers = await listFlyerDesignerEmails();
    await Promise.all([
      notifyDesignersOfFlyerRequest(ev, designers, ev.submitted_by, trimmed, { redesign: true }),
      notifyFlyerRejected(ev, normalizeEmails([ev.submitted_by]).filter((e) => e !== pu.email), pu.email, trimmed, {
        toDesignQueue: true,
      }),
    ]);
  } else {
    const recipients = normalizeEmails([ev.flyer_uploaded_by, ev.submitted_by]).filter(
      (e) => e !== pu.email,
    );
    await notifyFlyerRejected(ev, recipients, pu.email, trimmed, {
      toDesignQueue: ev.flyer_mode === "requested",
    });
  }

  revalidateFlyerSurfaces(ev.slug);
  return { ok: true, id: eventId };
}

/** Clear the flyer entirely (back to "no flyer"). Blocked once the event is
 *  published with an approved flyer — unpublish first. */
export async function removeEventFlyer(eventId: string): Promise<FlyerActionResult> {
  const pu = await getPortalUser();
  if (!pu) return { ok: false, error: "Not authorized." };

  const ev = await loadFlyerEvent(eventId);
  if (!ev) return { ok: false, error: "Event not found." };
  if (!canTouchFlyer(pu, ev.category)) {
    return { ok: false, error: "You can't manage this event's flyer." };
  }
  if (ev.published && ev.flyer_status === "approved") {
    return { ok: false, error: "This flyer is live on the published event — unpublish first." };
  }

  const { error } = await supabaseAdmin()
    .from("events")
    .update({
      flyer_mode: "none",
      flyer_status: "none",
      flyer_path: null,
      flyer_notes: null,
      flyer_uploaded_by: null,
      flyer_submitted_at: null,
      flyer_reviewed_by: null,
      flyer_reviewed_at: null,
    })
    .eq("id", eventId);
  if (error) return { ok: false, error: error.message };

  if (ev.flyer_path) {
    await supabaseAdmin().storage.from(FLYER_BUCKET).remove([ev.flyer_path]);
  }

  revalidateFlyerSurfaces(ev.slug);
  return { ok: true, id: eventId };
}
