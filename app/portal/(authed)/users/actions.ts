"use server";

import { revalidatePath } from "next/cache";
import { assertPastoral, type PortalRole } from "../../../../lib/portal-auth";
import { isAllowedAdminEmail } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";

const ROLES: PortalRole[] = ["member", "lead", "pastoral"];
const MINISTRIES = ["Youth", "Sisterhood", "Brotherhood", "Marriage"];

export type UpdateRoleInput = {
  profileId: string;
  role: PortalRole;
  ministries: string[];
};

export type UpdateRoleResult = { ok: true } | { ok: false; error: string };

export async function updateUserRole(input: UpdateRoleInput): Promise<UpdateRoleResult> {
  const actor = await assertPastoral();

  if (!ROLES.includes(input.role)) return { ok: false, error: "Unknown role." };
  const ministries =
    input.role === "lead" ? input.ministries.filter((m) => MINISTRIES.includes(m)) : [];
  if (input.role === "lead" && ministries.length === 0) {
    return { ok: false, error: "Pick at least one ministry for a lead." };
  }

  const sb = supabaseAdmin();
  const { data } = await sb
    .from("profiles")
    .select("email, role")
    .eq("id", input.profileId)
    .limit(1);
  const target = data?.[0] as { email: string; role: PortalRole } | undefined;
  if (!target) return { ok: false, error: "That account no longer exists." };

  // Staff roles require a church address (also enforced by a DB constraint).
  if (input.role !== "member" && !isAllowedAdminEmail(target.email)) {
    return { ok: false, error: "Lead and pastoral roles require an @nehtemple.org email." };
  }

  // Never demote the last pastoral account — that would lock approvals out.
  if (target.role === "pastoral" && input.role !== "pastoral") {
    const { count } = await sb
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("role", "pastoral");
    if ((count ?? 0) <= 1) {
      return { ok: false, error: "You can't remove the last pastoral account. Promote someone else first." };
    }
    if (target.email === actor.email) {
      // Self-demotion is allowed only when another pastoral remains — which
      // the count check above already guarantees at this point.
    }
  }

  const { error } = await sb
    .from("profiles")
    .update({ role: input.role, ministries, updated_at: new Date().toISOString() })
    .eq("id", input.profileId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/portal/users");
  revalidatePath("/portal", "layout");
  return { ok: true };
}
