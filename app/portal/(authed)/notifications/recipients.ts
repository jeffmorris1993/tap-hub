// Shared vocabulary for the notification settings page. No "use client" and no
// server imports, so the server page and the client cards can both use it.

import type { PortalRole } from "../../../../lib/portal-auth";

/** A staff account that can be picked as a recipient. */
export type StaffProfile = {
  id: string;
  /** Always lowercased by the server before it reaches the client. */
  email: string;
  full_name: string | null;
  role: PortalRole;
};

/**
 * One row of "These people will be emailed" under the Pastoral team option.
 *
 * The default list isn't just staff: it's pastoral-role profiles plus
 * EVENT_APPROVER_EMAILS, plus the prayer-team group for prayer. Classifying
 * them here is what lets the page name every real recipient instead of only
 * the ones who happen to have accounts.
 */
export type DefaultRecipient =
  | { source: "staff"; email: string; profile: StaffProfile }
  | { source: "group"; email: string }
  | { source: "extra"; email: string };

/** "A" · "A and B" · "A, B, and C" */
export function oxford(names: string[]): string {
  if (names.length === 0) return "";
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")}, and ${names[names.length - 1]}`;
}

export function personCount(n: number): string {
  return `${n} ${n === 1 ? "person" : "people"}`;
}

/** "3 people: Gary Price Jr., Jay Morris, and pastors@nehtemple.org" */
export function summaryText(names: string[]): string {
  return `${personCount(names.length)}: ${oxford(names)}`;
}
