import { Suspense } from "react";
import { requirePortalUser } from "../../../lib/portal-auth";
import { AdminShell } from "./AdminShell";
import { buildNavForRole } from "./admin-nav";
import { PendingBadge } from "./NavBadge";
import {
  avatarInitials,
  displayNameFromEmail,
} from "../../../lib/staff-display";

function roleLabel(role: "member" | "lead" | "pastoral", ministries: string[]): string {
  if (role === "pastoral") return "Pastoral";
  if (role === "lead") return ministries.length > 0 ? `Lead — ${ministries.join(", ")}` : "Lead";
  return "Member";
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const pu = await requirePortalUser();

  const email = pu.email || "(unknown)";
  const fullName = pu.profile.full_name?.trim();
  const name = fullName && fullName.length > 0 ? fullName : displayNameFromEmail(email);
  const persona = {
    name,
    email,
    role: roleLabel(pu.role, pu.ministries),
    initials: avatarInitials(fullName, email),
  };

  // Badge counts stream in behind Suspense so the shell paints without
  // waiting on the two HEAD count queries. Only pastoral sees them.
  const nav = buildNavForRole(pu.role, pu.ministries, {
    pendingEvents: (
      <Suspense fallback={null}>
        <PendingBadge table="events" />
      </Suspense>
    ),
    pendingAnnouncements: (
      <Suspense fallback={null}>
        <PendingBadge table="announcements" />
      </Suspense>
    ),
    pendingEventsCompact: (
      <Suspense fallback={null}>
        <PendingBadge table="events" variant="compact" />
      </Suspense>
    ),
    pendingAnnouncementsCompact: (
      <Suspense fallback={null}>
        <PendingBadge table="announcements" variant="compact" />
      </Suspense>
    ),
  }, pu.capabilities);

  return (
    <AdminShell persona={persona} nav={nav} role={pu.role}>
      {children}
    </AdminShell>
  );
}
