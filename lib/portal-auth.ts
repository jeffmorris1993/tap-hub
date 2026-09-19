import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { supabaseSession, isAllowedAdminEmail } from "./supabase/auth";
import { supabaseAdmin } from "./supabase/server";
import { isApprover } from "./approvers";

/**
 * Portal roles:
 *   member   — any email; sees only their own stuff (signups, forms, profile)
 *   lead     — staff email; admin abilities scoped to their ministries
 *   pastoral — staff email; sees and administers everything, incl. approvals
 *
 * Roles live in public.profiles. Two runtime adjustments:
 *   1. Bootstrap: an email on EVENT_APPROVER_EMAILS is treated as pastoral
 *      even before its profile says so — the first pastoral users can sign
 *      in and hand out roles in /portal/users without a chicken-and-egg
 *      lockout. Empty the env var once real roles are assigned.
 *   2. Demotion: a lead/pastoral profile whose email no longer passes the
 *      staff-domain check acts as a member (belt-and-braces on top of the
 *      DB check constraint).
 */
export type PortalRole = "member" | "lead" | "pastoral";

export type PortalProfile = {
  full_name: string | null;
  role: PortalRole;
  ministries: string[];
};

export type PortalUser = {
  user: User;
  email: string;
  profile: PortalProfile;
  /** Effective role after bootstrap/demotion adjustments. */
  role: PortalRole;
  ministries: string[];
};

function effectiveRole(email: string, profileRole: PortalRole): PortalRole {
  if (isApprover(email)) return "pastoral";
  if (profileRole !== "member" && !isAllowedAdminEmail(email)) return "member";
  return profileRole;
}

/** The signed-in portal user with their resolved role, or null. cache()
 *  dedupes the auth + profile lookups across layout and page in one request. */
export const getPortalUser = cache(async (): Promise<PortalUser | null> => {
  const sb = await supabaseSession();
  const { data, error } = await sb.auth.getUser();
  if (error || !data.user) return null;
  const email = (data.user.email ?? "").toLowerCase();

  const { data: rows } = await supabaseAdmin()
    .from("profiles")
    .select("full_name, role, ministries")
    .eq("id", data.user.id)
    .limit(1);
  const p = rows?.[0] as { full_name: string | null; role: PortalRole; ministries: string[] } | undefined;
  const profile: PortalProfile = {
    full_name: p?.full_name ?? ((data.user.user_metadata?.full_name as string | undefined) ?? null),
    role: p?.role ?? "member",
    ministries: p?.ministries ?? [],
  };
  const role = effectiveRole(email, profile.role);
  return { user: data.user, email, profile, role, ministries: profile.ministries };
});

/** Page guards — redirect away when the viewer doesn't qualify. */
export async function requirePortalUser(): Promise<PortalUser> {
  const pu = await getPortalUser();
  if (!pu) redirect("/portal/login");
  return pu;
}

export async function requireLead(): Promise<PortalUser> {
  const pu = await requirePortalUser();
  if (pu.role === "member") redirect("/portal");
  return pu;
}

export async function requirePastoral(): Promise<PortalUser> {
  const pu = await requirePortalUser();
  if (pu.role !== "pastoral") redirect("/portal");
  return pu;
}

/** Action guards — throw instead of redirect, for use inside Server Actions
 *  and route handlers where an error response is the right failure mode. */
export async function assertLead(): Promise<PortalUser> {
  const pu = await getPortalUser();
  if (!pu || pu.role === "member") throw new Error("Not authorized");
  return pu;
}

export async function assertPastoral(): Promise<PortalUser> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") throw new Error("Not authorized");
  return pu;
}

/**
 * The ministry filter for content queries. null = unscoped (pastoral sees
 * everything); a lead sees their own ministries — plus 'General' where the
 * surface includes church-wide content (announcements).
 */
export function ministryScope(pu: PortalUser, opts: { includeGeneral?: boolean } = {}): string[] | null {
  if (pu.role === "pastoral") return null;
  const scope = [...pu.ministries];
  if (opts.includeGeneral && !scope.includes("General")) scope.push("General");
  return scope;
}

/** Resolve a role for a bare email — the agent channels (SMS/email/chat)
 *  authorize senders without a browser session. */
export async function getRoleForEmail(email: string | null | undefined): Promise<PortalRole | null> {
  if (!email) return null;
  const e = email.toLowerCase();
  if (isApprover(e)) return "pastoral";
  const { data } = await supabaseAdmin().from("profiles").select("role").eq("email", e).limit(1);
  const role = data?.[0]?.role as PortalRole | undefined;
  if (!role) return null;
  return effectiveRole(e, role);
}
