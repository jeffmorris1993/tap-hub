"use server";

import { revalidatePath } from "next/cache";
import { supabaseSession } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";

export async function updateProfile(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (fullName.length > 80) {
    return { ok: false, error: "Name is too long (max 80 characters)." };
  }

  const sb = await supabaseSession();
  const { data: userData, error } = await sb.auth.updateUser({
    data: { full_name: fullName || null },
  });
  if (error) return { ok: false, error: error.message };

  // Keep the profiles row in sync — it's what the portal layout and the
  // pastoral Users page read.
  if (userData.user) {
    await supabaseAdmin()
      .from("profiles")
      .update({ full_name: fullName || null, updated_at: new Date().toISOString() })
      .eq("id", userData.user.id);
  }

  // The sidebar / persona pill are rendered in the admin layout, which is
  // a parent of every admin route — bust the cache so the new name shows
  // up immediately on the next page render.
  revalidatePath("/portal", "layout");
  return { ok: true };
}
