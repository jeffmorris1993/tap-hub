import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAdminUser } from "../../../lib/supabase/auth";
import { isApprover } from "../../../lib/approvers";
import { AdminShell } from "./AdminShell";
import { buildNav } from "./admin-nav";
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

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const email = user.email ?? "(unknown)";
  const fullName = (user.user_metadata?.full_name as string | undefined)?.trim();
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
    role: isApprover(email) ? "Approver" : "Admin",
    initials,
  };

  // Badge counts stream in behind Suspense so the shell paints without
  // waiting on the two HEAD count queries.
  const nav = buildNav(
    <Suspense fallback={null}>
      <PendingBadge table="events" />
    </Suspense>,
    <Suspense fallback={null}>
      <PendingBadge table="announcements" />
    </Suspense>,
  );

  return (
    <AdminShell persona={persona} nav={nav}>
      {children}
    </AdminShell>
  );
}
