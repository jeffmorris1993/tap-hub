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
