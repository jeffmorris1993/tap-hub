import "server-only";
import type { User } from "@supabase/supabase-js";
import { getGoogleAccessToken } from "./google-auth";
import { isAllowedAdminEmail } from "./supabase/auth";
import { supabaseAdmin } from "./supabase/server";
import { PORTAL_CAPABILITIES, type PortalCapability, type PortalRole } from "./portal-auth";

/**
 * Portal roles from Google Workspace group membership.
 *
 * The church already manages who is staff in the Admin console, so that is the
 * source of truth: a sign-in reads the person's groups and writes the matching
 * role onto their profile. Nobody has to be promoted twice.
 *
 * Verified against the live Directory API on 2026-10-31:
 *   - No domain-wide delegation is needed. The service account holds the
 *     Workspace "Groups Reader" admin role, which is enough on its own, so
 *     getGoogleAccessToken() (which cannot set a `sub` claim) is sufficient.
 *   - `&domain=` is REQUIRED. Without it the call 404s with "Domain not found",
 *     because a service account has no domain of its own for Google to infer.
 */

const SCOPE = "https://www.googleapis.com/auth/admin.directory.group.readonly";
const LOG = "workspace-groups";

/** Mirrors the assignable list in app/portal/(authed)/users/actions.ts. */
const MINISTRIES = ["Youth", "Sisterhood", "Brotherhood", "Marriage", "Music"];

/** Group membership changes rarely; a sign-in burst shouldn't fan out to Google. */
const CACHE_MS = 5 * 60_000;

type Grant =
  | { kind: "pastoral" }
  | { kind: "lead"; ministry: string }
  | { kind: "capability"; capability: PortalCapability };

export type ResolvedAccess = {
  role: PortalRole;
  ministries: string[];
  capabilities: PortalCapability[];
};

const cache = new Map<string, { at: number; value: ResolvedAccess | null }>();

/**
 * PORTAL_ROLE_GROUPS is a comma-separated list of `group=grant`, where grant is
 * `pastoral`, `lead:<Ministry>`, or `cap:<capability>`. Unparseable or unknown
 * entries are dropped with a warning rather than throwing — a typo in an env
 * var must not take sign-in down.
 */
function parseRoleGroups(): Map<string, Grant> {
  const out = new Map<string, Grant>();
  for (const entry of (process.env.PORTAL_ROLE_GROUPS ?? "").split(",")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const eq = trimmed.lastIndexOf("=");
    if (eq < 0) {
      console.warn(`[${LOG}] ignoring malformed entry (no '='):`, trimmed);
      continue;
    }
    const group = trimmed.slice(0, eq).trim().toLowerCase();
    const grant = trimmed.slice(eq + 1).trim();

    if (grant === "pastoral") {
      out.set(group, { kind: "pastoral" });
    } else if (grant.startsWith("lead:")) {
      const ministry = grant.slice(5);
      if (!MINISTRIES.includes(ministry)) {
        console.warn(`[${LOG}] ignoring unknown ministry "${ministry}" for`, group);
        continue;
      }
      out.set(group, { kind: "lead", ministry });
    } else if (grant.startsWith("cap:")) {
      const capability = grant.slice(4) as PortalCapability;
      if (!PORTAL_CAPABILITIES.includes(capability)) {
        console.warn(`[${LOG}] ignoring unknown capability "${capability}" for`, group);
        continue;
      }
      out.set(group, { kind: "capability", capability });
    } else {
      console.warn(`[${LOG}] ignoring unknown grant "${grant}" for`, group);
    }
  }
  return out;
}

/** The groups this address belongs to, or null if Google couldn't be asked. */
async function listGroups(email: string): Promise<string[] | null> {
  const token = await getGoogleAccessToken([SCOPE], LOG);
  if (!token) return null; // getGoogleAccessToken already logged why

  const domain = email.slice(email.lastIndexOf("@") + 1);
  const url =
    "https://admin.googleapis.com/admin/directory/v1/groups" +
    `?userKey=${encodeURIComponent(email)}&domain=${encodeURIComponent(domain)}&maxResults=200`;

  try {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      console.error(`[${LOG}] directory lookup failed`, res.status, (await res.text()).slice(0, 300));
      return null;
    }
    const body = (await res.json()) as { groups?: { email?: string }[] };
    return (body.groups ?? []).map((g) => (g.email ?? "").toLowerCase()).filter(Boolean);
  } catch (err) {
    console.error(`[${LOG}] directory lookup threw`, err);
    return null;
  }
}

/**
 * Resolve an address to the access its Workspace groups grant.
 *
 * Returns null when the answer is unknown — not a church address, no group map
 * configured, or Google could not be reached. Callers must treat null as "leave
 * the profile alone", never as "no access": a Directory outage must not demote
 * the whole staff.
 *
 * A church address that matches no group resolves to a plain member. That is a
 * real answer, not an unknown one, and is what makes removing someone from a
 * group actually revoke their access.
 */
export async function resolveFromGroups(email: string): Promise<ResolvedAccess | null> {
  const addr = email.trim().toLowerCase();

  // A personal Gmail can never hold a staff role (profiles_staff_domain_check
  // enforces the same rule), so don't spend a Directory call on one.
  if (!isAllowedAdminEmail(addr)) return null;

  const map = parseRoleGroups();
  if (map.size === 0) return null;

  const hit = cache.get(addr);
  if (hit && Date.now() - hit.at < CACHE_MS) return hit.value;

  const groups = await listGroups(addr);
  if (groups === null) {
    // Deliberately not cached: retry on the next sign-in rather than holding a
    // failure for five minutes.
    return null;
  }

  const ministries = new Set<string>();
  const capabilities = new Set<PortalCapability>();
  let pastoral = false;

  for (const group of groups) {
    const grant = map.get(group);
    if (!grant) continue;
    if (grant.kind === "pastoral") pastoral = true;
    else if (grant.kind === "lead") ministries.add(grant.ministry);
    else capabilities.add(grant.capability);
  }

  // Pastoral is unscoped and already implies every capability, so it clears
  // both lists rather than carrying redundant state (matching updateUserRole).
  const value: ResolvedAccess = pastoral
    ? { role: "pastoral", ministries: [], capabilities: [] }
    : ministries.size > 0
      ? { role: "lead", ministries: [...ministries], capabilities: [...capabilities] }
      : { role: "member", ministries: [], capabilities: [...capabilities] };

  cache.set(addr, { at: Date.now(), value });
  return value;
}

const sameSet = (a: string[], b: string[]) =>
  a.length === b.length && [...a].sort().join("|") === [...b].sort().join("|");

/**
 * Apply Workspace groups to the signed-in user's profile. Called from
 * /auth/callback after the session exists.
 *
 * Never throws: a Google outage, a bad group map, or a database hiccup must not
 * stop someone signing in. Worst case their role is simply not updated.
 */
export async function syncWorkspaceAccess(user: User): Promise<void> {
  try {
    const email = (user.email ?? "").trim().toLowerCase();
    if (!email) return;

    const sb = supabaseAdmin();
    const { data } = await sb
      .from("profiles")
      .select("id, full_name, role, ministries, capabilities")
      .eq("id", user.id)
      .limit(1);
    const profile = data?.[0] as
      | {
          id: string;
          full_name: string | null;
          role: PortalRole;
          ministries: string[];
          capabilities: PortalCapability[] | null;
        }
      | undefined;
    if (!profile) return; // the auth trigger will have made one; nothing to do yet

    const patch: Record<string, unknown> = {};

    // Google supplies a display name; the trigger only fills it on INSERT, so a
    // profile that pre-dated this (or was made by an older trigger) can still be
    // nameless. Never overwrite a name someone already has.
    if (!profile.full_name?.trim()) {
      const meta = user.user_metadata ?? {};
      const name = (meta.full_name as string | undefined) ?? (meta.name as string | undefined);
      if (name?.trim()) patch.full_name = name.trim();
    }

    const resolved = await resolveFromGroups(email);
    if (resolved) {
      const current = {
        role: profile.role,
        ministries: profile.ministries ?? [],
        capabilities: profile.capabilities ?? [],
      };
      const changed =
        current.role !== resolved.role ||
        !sameSet(current.ministries, resolved.ministries) ||
        !sameSet(current.capabilities, resolved.capabilities);

      if (changed) {
        // Never let a group edit lock the portal out of its own approvals. The
        // same guard exists in updateUserRole(); this is the automated path.
        const demotingPastoral = current.role === "pastoral" && resolved.role !== "pastoral";
        let safe = true;
        if (demotingPastoral) {
          const { count } = await sb
            .from("profiles")
            .select("*", { count: "exact", head: true })
            .eq("role", "pastoral");
          if ((count ?? 0) <= 1) {
            safe = false;
            console.warn(
              `[${LOG}] refusing to demote the last pastoral account (${email}) — ` +
                "add someone to the pastoral group first",
            );
          }
        }
        if (safe) {
          patch.role = resolved.role;
          patch.ministries = resolved.ministries;
          patch.capabilities = resolved.capabilities;
          console.info(
            `[${LOG}] ${email}: ${current.role} -> ${resolved.role}`,
            resolved.ministries,
            resolved.capabilities,
          );
        }
      }
    }

    if (Object.keys(patch).length === 0) return;
    patch.updated_at = new Date().toISOString();
    const { error } = await sb.from("profiles").update(patch).eq("id", profile.id);
    if (error) console.error(`[${LOG}] profile update failed`, error);
  } catch (err) {
    console.error(`[${LOG}] sync threw`, err);
  }
}
