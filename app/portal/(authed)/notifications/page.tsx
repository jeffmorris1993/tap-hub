import { requirePastoral, type PortalRole } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import {
  NOTIFICATION_KINDS,
  type NotificationKind,
} from "../../../../lib/notification-kinds";
import {
  getDefaultRecipientsByKind,
  getPrayerTeamEmail,
} from "../../../../lib/notification-routes";
import { NotificationSettings } from "./NotificationSettings";
import type { DefaultRecipient, StaffProfile } from "./recipients";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  await requirePastoral();

  const sb = supabaseAdmin();
  const [{ data: staffData, error: staffError }, { data: routeData, error: routeError }, defaultsByKind] =
    await Promise.all([
      sb
        .from("profiles")
        .select("id, email, full_name, role")
        .neq("role", "member")
        .order("email", { ascending: true }),
      sb.from("notification_routes").select("kind, recipients"),
      getDefaultRecipientsByKind(),
    ]);
  if (staffError) throw staffError;
  if (routeError) throw routeError;

  const staff: StaffProfile[] = ((staffData ?? []) as Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: PortalRole;
  }>).map((s) => ({ ...s, email: s.email.toLowerCase() }));

  const routes = {} as Record<NotificationKind, string[]>;
  for (const kind of NOTIFICATION_KINDS) routes[kind] = [];
  for (const row of (routeData ?? []) as Array<{ kind: string; recipients: string[] }>) {
    if (row.kind in routes) routes[row.kind as NotificationKind] = row.recipients ?? [];
  }

  // Classify the resolved defaults here so the client is a pure view over a
  // finished list. The default isn't only staff: it's pastoral-role profiles
  // plus EVENT_APPROVER_EMAILS, plus the prayer-team group for prayer. The
  // page used to show pastoral profiles alone, which under-reported who
  // actually receives confidential prayer requests.
  const byEmail = new Map(staff.map((p) => [p.email, p]));
  const prayerTeam = getPrayerTeamEmail();
  const classify = (email: string): DefaultRecipient => {
    // Profiles are matched first on purpose: an env approver who also has an
    // account should appear as themselves with a correct role tag rather than
    // as an anonymous address.
    const profile = byEmail.get(email);
    if (profile) return { source: "staff", email, profile };
    if (prayerTeam && email === prayerTeam) return { source: "group", email };
    return { source: "extra", email };
  };

  const defaults = {} as Record<NotificationKind, DefaultRecipient[]>;
  for (const kind of NOTIFICATION_KINDS) {
    defaults[kind] = (defaultsByKind[kind] ?? []).map(classify);
  }

  // Role-derived, unlike the per-card lists above. The banner's "Change roles
  // in Users" link only governs this set, so listing env-configured addresses
  // there would promise an edit that page can't make.
  const pastoralTeam = staff.filter((p) => p.role === "pastoral");

  return (
    <NotificationSettings
      staff={staff}
      routes={routes}
      defaults={defaults}
      pastoralTeam={pastoralTeam}
    />
  );
}
