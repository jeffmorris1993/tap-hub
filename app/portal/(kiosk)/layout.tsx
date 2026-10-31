import { requireLead } from "../../../lib/portal-auth";

/**
 * Chrome-free portal routes, for screens that are pointed at a room rather
 * than operated by one person: the check-in display on a TV or a tablet by the
 * door. No sidebar, no bottom tab bar, no page header — the sibling (authed)
 * layout's AdminShell would waste most of the screen and invite a visitor to
 * wander into the admin.
 *
 * Still behind the same gate: proxy.ts requires a session for every /portal
 * path, and requireLead() keeps members out.
 */
export default async function KioskLayout({ children }: { children: React.ReactNode }) {
  await requireLead();
  return children;
}
