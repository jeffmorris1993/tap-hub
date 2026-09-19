import { Suspense } from "react";
import { requirePortalUser } from "../../../lib/portal-auth";
import { AdminShell } from "./AdminShell";
import { buildNavForRole } from "./admin-nav";
import { PendingBadge } from "./NavBadge";

function initialsFromEmail(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}

function displayName(email: string): string {
  const local = email.split("@")[0] ?? email;
  const parts = local.split(/[._-]+/).filter(Boolean);
  return parts.length > 0
    ? parts.map((p) => p[0].toUpperCase() + p.slice(1)).join(" ")
    : email;
}

function roleLabel(role: "member" | "lead" | "pastoral", ministries: string[]): string {
  if (role === "pastoral") return "Pastoral";
  if (role === "lead") return ministries.length > 0 ? `Lead — ${ministries.join(", ")}` : "Lead";
  return "Member";
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const pu = await requirePortalUser();

  const email = pu.email || "(unknown)";
  const fullName = pu.profile.full_name?.trim();
  const name = fullName && fullName.length > 0 ? fullName : displayName(email);
  const initials = fullName
    ? fullName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((p) => p[0]?.toUpperCase() ?? "")
        .join("") || initialsFromEmail(email)
    : initialsFromEmail(email);
  const persona = {
    name,
    email,
    role: roleLabel(pu.role, pu.ministries),
    initials,
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
  });

  return (
    <AdminShell persona={persona} nav={nav}>
      {children}
    </AdminShell>
  );
}
