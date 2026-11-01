// How a staff member is drawn: their initials, and the chip that names their
// role. Client-safe — the PortalRole import is type-only, so nothing from the
// server-only portal-auth module is pulled in at runtime.
//
// These were copied in three places before (the users list, the notifications
// editor, and the portal layout), each drifting slightly. One source now.

import type { PortalRole } from "./portal-auth";

export type RoleBadge = {
  bg: string;
  color: string;
  /** Short form, for a dense row or a role-picker button. */
  label: string;
  /** Spelled out, for a recipient list where there's room to be clear. */
  longLabel: string;
};

/**
 * Both labels exist on purpose. The users page uses this table for its
 * role-picker buttons as well as the row chip, so a single "Ministry Lead"
 * would quietly relabel those buttons.
 */
export const ROLE_BADGE: Record<PortalRole, RoleBadge> = {
  member: {
    bg: "rgba(154,163,184,.16)",
    color: "#cdd3e0",
    label: "Member",
    longLabel: "Member",
  },
  lead: {
    bg: "rgba(231,184,78,.14)",
    color: "#e7b84e",
    label: "Lead",
    longLabel: "Ministry Lead",
  },
  pastoral: {
    bg: "rgba(90,208,127,.14)",
    color: "#7fe0a0",
    label: "Pastoral",
    longLabel: "Pastoral",
  },
};

/**
 * Cosmetic role aliases for specific accounts. The role itself is unchanged —
 * an address listed here still holds `pastoral` and every power that comes
 * with it; only the words on the chip differ. websitemediaadmin runs the site,
 * not the pulpit, and "Pastoral" on their row reads as a claim to be a pastor.
 *
 * Keys must be lowercase: lookups lowercase the address first.
 */
const ROLE_LABEL_OVERRIDES: Record<string, { label: string; longLabel: string }> = {
  "websitemediaadmin@nehtemple.org": { label: "Admin", longLabel: "Admin" },
};

/** The alias for an address, or null if it uses its role's own labels. */
export function roleLabelOverride(
  email: string | null | undefined,
): { label: string; longLabel: string } | null {
  if (!email) return null;
  return ROLE_LABEL_OVERRIDES[email.toLowerCase()] ?? null;
}

/**
 * The chip for one person. Prefer this over indexing ROLE_BADGE directly
 * wherever the role belongs to somebody — ROLE_BADGE is for labeling the roles
 * themselves, like the role-picker buttons on the users page.
 *
 * An override replaces only the text. `bg`/`color` still come from the role, so
 * the chip keeps signalling what the account can actually do.
 */
export function roleBadgeFor(role: PortalRole, email: string | null | undefined): RoleBadge {
  const override = roleLabelOverride(email);
  return override ? { ...ROLE_BADGE[role], ...override } : ROLE_BADGE[role];
}

/** "jeff.morr@nehtemple.org" → "JM"; "pastorjones@…" → "PA". */
export function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

/** "jeff.morr@nehtemple.org" → "Jeff Morr", for accounts with no full_name. */
export function displayNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  return parts.length > 0
    ? parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(" ")
    : email;
}

/**
 * Initials for an avatar bubble. A real name gives its first two words;
 * otherwise we fall back to two letters from the email rather than one, which
 * is what the users page has always shown and reads better in a 36px circle.
 */
export function avatarInitials(fullName: string | null | undefined, email: string): string {
  const name = fullName?.replace(/\./g, "").trim();
  if (name) {
    const letters = name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
    if (letters) return letters;
  }
  return initialsFromEmail(email);
}

/** The name to show for a staff member: their own, or one inferred from email. */
export function staffDisplayName(
  fullName: string | null | undefined,
  email: string,
): string {
  return fullName?.trim() || email;
}
