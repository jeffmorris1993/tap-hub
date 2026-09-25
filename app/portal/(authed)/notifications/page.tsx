import { requirePastoral, type PortalRole } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { NOTIFICATION_KINDS } from "../../../../lib/notification-routes";
import { RoutesEditor, type StaffProfile } from "./RoutesEditor";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requirePastoral();

  const sb = supabaseAdmin();
  const [{ data: staffData, error: staffError }, { data: routeData, error: routeError }] =
    await Promise.all([
      sb
        .from("profiles")
        .select("id, email, full_name, role")
        .neq("role", "member")
        .order("email", { ascending: true }),
      sb.from("notification_routes").select("kind, recipients"),
    ]);
  if (staffError) throw staffError;
  if (routeError) throw routeError;

  const staff: StaffProfile[] = ((staffData ?? []) as Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: PortalRole;
  }>).map((s) => ({ ...s, email: s.email.toLowerCase() }));

  const routes: Record<string, string[]> = {};
  for (const kind of NOTIFICATION_KINDS) routes[kind] = [];
  for (const row of (routeData ?? []) as Array<{ kind: string; recipients: string[] }>) {
    if (row.kind in routes) routes[row.kind] = row.recipients ?? [];
  }

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 600, marginBottom: "22px" }}>
        Choose who gets emailed when someone submits a prayer request or feedback. When a
        list is empty, everyone with the{" "}
        <strong style={{ color: "#cdd3e0" }}>pastoral</strong> role receives it.
      </p>
      <RoutesEditor staff={staff} prayer={routes.prayer} feedback={routes.feedback} />
    </div>
  );
}
