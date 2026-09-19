"use server";

import { revalidatePath } from "next/cache";
import { requirePortalUser } from "../../../../lib/portal-auth";
import { cancelMySignup } from "../../../../lib/supabase/admin-queries";

export async function cancelSignup(signupId: string): Promise<{ ok: boolean; error?: string }> {
  const pu = await requirePortalUser();
  // Deletes only rows whose user_id matches — you can't cancel someone
  // else's signup by guessing ids.
  const removed = await cancelMySignup(signupId, pu.user.id);
  if (!removed) return { ok: false, error: "Couldn't cancel that signup." };
  revalidatePath("/portal/my-events");
  revalidatePath("/portal");
  return { ok: true };
}
