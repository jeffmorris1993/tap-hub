"use server";

import { revalidatePath } from "next/cache";
import { assertLead } from "../../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import { loadServiceById } from "../../../../../lib/attendance-data";
import { dowOfIso } from "../../../../../lib/attendance";

export type WalkinResult =
  | { ok: true; walkinId: string }
  | { ok: false; error: string };

export type UndoWalkinResult = { ok: true } | { ok: false; error: string };

/**
 * Whether `dateIso` is a real occurrence of this service. Server Actions are
 * reachable by direct POST, so the date can't be taken on trust — otherwise a
 * crafted request could file walk-ins against dates the service never ran.
 */
function occursOn(
  service: { kind: string; day_of_week: number | null; service_date: string | null },
  dateIso: string,
): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateIso)) return false;
  if (service.kind === "oneoff") return service.service_date === dateIso;
  return service.day_of_week === dowOfIso(dateIso);
}

/**
 * Count one anonymous arrival — someone at the door who can't or won't check
 * in on a phone.
 *
 * One row per tap rather than a counter, so Undo removes exactly the last one
 * and the id never has to be guessed.
 */
export async function addWalkin(input: {
  serviceId: string;
  occurrenceDate: string;
}): Promise<WalkinResult> {
  const actor = await assertLead();

  const service = await loadServiceById(input.serviceId);
  if (!service) return { ok: false, error: "That check-in window no longer exists." };
  if (!occursOn(service, input.occurrenceDate)) {
    return { ok: false, error: "That isn't a date this runs on." };
  }

  const { data, error } = await supabaseAdmin()
    .from("checkin_walkins")
    .insert({
      service_id: input.serviceId,
      occurrence_date: input.occurrenceDate,
      created_by: actor.email,
    })
    .select("id")
    .single();
  if (error) {
    console.error("[display] walk-in insert failed", error);
    return { ok: false, error: "Couldn't count that. Try again." };
  }

  revalidatePath(`/portal/display/${input.serviceId}`);
  revalidatePath("/portal/attendance");
  return { ok: true, walkinId: data.id as string };
}

/**
 * Remove a walk-in this session added. The display screen remembers the ids it
 * created, so Undo can only ever take back its own taps.
 */
export async function undoWalkin(input: {
  walkinId: string;
}): Promise<UndoWalkinResult> {
  await assertLead();

  const { data, error } = await supabaseAdmin()
    .from("checkin_walkins")
    .delete()
    .eq("id", input.walkinId)
    .select("service_id")
    .maybeSingle();
  if (error) {
    console.error("[display] walk-in delete failed", error);
    return { ok: false, error: "Couldn't undo that. Try again." };
  }

  if (data?.service_id) revalidatePath(`/portal/display/${data.service_id as string}`);
  revalidatePath("/portal/attendance");
  return { ok: true };
}
