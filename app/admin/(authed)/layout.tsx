import { redirect } from "next/navigation";
import { getAdminUser } from "../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../lib/supabase/server";
import { isApprover } from "../../../lib/approvers";
import { AdminShell } from "./AdminShell";
import { buildNav } from "./admin-nav";

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

  // Pull the pending-events count once for the sidebar badge — same query
  // the queue page uses, lightweight HEAD count.
  const { count } = await supabaseAdmin()
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("approval_status", "pending");
  const pendingCount = count ?? 0;

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

  const nav = buildNav(pendingCount);

  return (
    <AdminShell persona={persona} nav={nav}>
      {children}
    </AdminShell>
  );
}
