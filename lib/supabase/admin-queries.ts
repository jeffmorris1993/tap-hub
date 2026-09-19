import "server-only";
import { supabaseAdmin } from "./server";
import type { RecurrenceKind, RecurringEventFields } from "../events-occurrence";
import { isSeriesOver } from "../event-calendar";
import { detroitDateIso } from "../tz";

export type DashboardCounts = {
  visitors: number;
  feedback: number;
  prayers: number;
  signups: number;
  publishedEvents: number;
  pendingEvents: number;
  recentVisitors24h: number;
};

/** `scope` = ministry filter for lead roles (null/omitted = church-wide). */
export async function getDashboardCounts(scope: string[] | null = null): Promise<DashboardCounts> {
  const sb = supabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const feedbackQ = sb.from("feedback").select("*", { count: "exact", head: true });
  const prayersQ = sb.from("prayer_requests").select("*", { count: "exact", head: true });
  const signupsQ = scope
    ? sb.from("event_signups").select("id, events!inner(category)", { count: "exact", head: true }).in("events.category", scope)
    : sb.from("event_signups").select("*", { count: "exact", head: true });
  const eventsQ = sb
    .from("events")
    .select("starts_at, ends_at, recurrence_kind, recurrence_byday, recurrence_until")
    .eq("published", true)
    .eq("approval_status", "approved");
  const pendingQ = sb.from("events").select("*", { count: "exact", head: true }).eq("approval_status", "pending");
  const [v, f, p, s, e, ep, vRecent] = await Promise.all([
    sb.from("visitors").select("*", { count: "exact", head: true }),
    scope ? feedbackQ.in("ministry", scope) : feedbackQ,
    scope ? prayersQ.in("ministry", scope) : prayersQ,
    signupsQ,
    scope ? eventsQ.in("category", scope) : eventsQ,
    scope ? pendingQ.in("category", scope) : pendingQ,
    sb.from("visitors").select("*", { count: "exact", head: true }).gte("created_at", since24h),
  ]);
  // Count only live/upcoming events so the KPI doesn't inflate forever.
  const todayIso = detroitDateIso();
  const currentEvents = ((e.data ?? []) as RecurringEventFields[]).filter(
    (ev) => !isSeriesOver(ev, todayIso),
  ).length;
  return {
    visitors: v.count ?? 0,
    feedback: f.count ?? 0,
    prayers: p.count ?? 0,
    signups: s.count ?? 0,
    publishedEvents: currentEvents,
    pendingEvents: ep.count ?? 0,
    recentVisitors24h: vRecent.count ?? 0,
  };
}

export type VisitorRow = {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  first_time: boolean | null;
  interests: string[];
  created_at: string;
};

export async function listVisitors(limit = 100): Promise<VisitorRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("visitors")
    .select("id, name, email, phone, first_time, interests, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type FeedbackRow = {
  id: string;
  rating: number | null;
  category: string;
  ministry: string;
  name: string | null;
  message: string;
  created_at: string;
};

export async function listFeedback(limit = 100, scope: string[] | null = null): Promise<FeedbackRow[]> {
  let q = supabaseAdmin()
    .from("feedback")
    .select("id, rating, category, ministry, name, message, created_at");
  if (scope) q = q.in("ministry", scope);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type PrayerRow = {
  id: string;
  name: string | null;
  contact: string | null;
  request: string;
  confidential: boolean;
  prayer_wall: boolean;
  ministry: string;
  created_at: string;
};

export async function listPrayers(limit = 100, scope: string[] | null = null): Promise<PrayerRow[]> {
  let q = supabaseAdmin()
    .from("prayer_requests")
    .select("id, name, contact, request, confidential, prayer_wall, ministry, created_at");
  if (scope) q = q.in("ministry", scope);
  const { data, error } = await q.order("created_at", { ascending: false }).limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type SignupRow = {
  id: string;
  event_id: string;
  name: string;
  contact: string;
  role: "attendee" | "volunteer";
  occurrence_date: string | null;
  created_at: string;
  events: { slug: string; title: string } | null;
};

export type EventSignupRow = {
  id: string;
  name: string;
  contact: string;
  role: "attendee" | "volunteer";
  notes: string | null;
  occurrence_date: string | null;
  created_at: string;
};

export async function listSignupsForEvent(eventId: string): Promise<EventSignupRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("event_signups")
    .select("id, name, contact, role, notes, occurrence_date, created_at")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as EventSignupRow[];
}

export async function listSignups(limit = 200, scope: string[] | null = null): Promise<SignupRow[]> {
  // Scoped reads join the parent event so a lead only sees signups for
  // their ministry's events.
  let q = supabaseAdmin()
    .from("event_signups")
    .select(
      scope
        ? "id, event_id, name, contact, role, occurrence_date, created_at, events!inner(slug, title, category)"
        : "id, event_id, name, contact, role, occurrence_date, created_at, events(slug, title)",
    );
  if (scope) q = q.in("events.category", scope);
  const { data, error } = await q
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: unknown) => {
    const r = row as SignupRow & { events: SignupRow["events"] | SignupRow["events"][] };
    const events = Array.isArray(r.events) ? r.events[0] ?? null : r.events;
    return { ...r, events };
  });
}

export type IgniteChildRow = {
  id: string;
  sort_order: number;
  full_name: string;
  date_of_birth: string;
  grade: string;
  school: string | null;
  tshirt_size: string | null;
  interests: string;
  spiritual_needs: string;
  support_notes: string | null;
  health_notes: string | null;
};

export type IgniteFamilyRow = {
  id: string;
  guardian_name: string;
  guardian_relationship: string;
  guardian_phone: string;
  guardian_email: string;
  contact_preference: "text" | "email" | "flocknote" | "phone";
  second_guardian_name: string | null;
  second_guardian_relationship: string | null;
  second_guardian_phone: string | null;
  second_guardian_email: string | null;
  support_parents: string | null;
  more_of_2027: string | null;
  wish_offered: string | null;
  could_improve: string | null;
  volunteer_interest: "yes" | "maybe" | "not_now" | null;
  volunteer_areas: string[];
  volunteer_areas_other: string | null;
  participation_helps: string[];
  participation_helps_other: string | null;
  anything_else: string | null;
  created_at: string;
  ignite_children: IgniteChildRow[];
};

const IGNITE_FAMILY_FIELDS =
  "id, guardian_name, guardian_relationship, guardian_phone, guardian_email, " +
  "contact_preference, second_guardian_name, second_guardian_relationship, " +
  "second_guardian_phone, second_guardian_email, support_parents, more_of_2027, " +
  "wish_offered, could_improve, volunteer_interest, volunteer_areas, " +
  "volunteer_areas_other, participation_helps, participation_helps_other, " +
  "anything_else, created_at, " +
  "ignite_children(id, sort_order, full_name, date_of_birth, grade, school, " +
  "tshirt_size, interests, spiritual_needs, support_notes, health_notes)";

/**
 * Ignite parent/family submissions with their children embedded. This reads
 * through the service-role client because the tables have RLS enabled with no
 * policies — see the 20260917 migration. Admin-only callers.
 */
export async function listIgniteFamilies(limit = 200): Promise<IgniteFamilyRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("ignite_families")
    .select(IGNITE_FAMILY_FIELDS)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as unknown as IgniteFamilyRow[]).map((family) => ({
    ...family,
    // PostgREST doesn't guarantee embed ordering; keep the order the parent
    // entered the children in.
    ignite_children: [...(family.ignite_children ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    ),
  }));
}

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  category: "Youth" | "Sisterhood" | "Brotherhood" | "Marriage" | "General";
  starts_at: string;
  ends_at: string | null;
  location: string;
  description_long: string;
  cost: string | null;
  accepts_rsvps: boolean;
  allow_volunteers: boolean;
  registration_url: string | null;
  registration_label: string | null;
  published: boolean;
  approval_status: "draft" | "pending" | "approved" | "rejected";
  approval_notes: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  recurrence_kind: RecurrenceKind;
  recurrence_byday: number | null;
  recurrence_until: string | null;
};

const ADMIN_EVENT_FIELDS =
  "id, slug, title, category, starts_at, ends_at, location, description_long, " +
  "cost, accepts_rsvps, allow_volunteers, registration_url, registration_label, " +
  "published, approval_status, approval_notes, " +
  "submitted_by, reviewed_by, submitted_at, reviewed_at, recurrence_kind, recurrence_byday, recurrence_until";

export async function listAllEvents(scope: string[] | null = null): Promise<AdminEventRow[]> {
  let q = supabaseAdmin().from("events").select(ADMIN_EVENT_FIELDS);
  if (scope) q = q.in("category", scope);
  const { data, error } = await q.order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminEventRow[];
}

export async function listPendingEvents(scope: string[] | null = null): Promise<AdminEventRow[]> {
  let q = supabaseAdmin().from("events").select(ADMIN_EVENT_FIELDS).eq("approval_status", "pending");
  if (scope) q = q.in("category", scope);
  const { data, error } = await q.order("submitted_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as AdminEventRow[];
}

export async function getAdminEventById(id: string): Promise<AdminEventRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(ADMIN_EVENT_FIELDS)
    .eq("id", id)
    .limit(1);
  if (error) throw error;
  return (data?.[0] ?? null) as unknown as AdminEventRow | null;
}

export type ActivityKind = "visitor" | "prayer" | "feedback" | "signup";
export type ActivityItem = {
  kind: ActivityKind;
  title: string;
  meta: string;
  created_at: string;
};

/** Merged recent activity across all submission tables, newest first.
 *  Scoped (lead) view filters by ministry and skips visitors — visitor
 *  follow-up is a pastoral surface. */
export async function getRecentActivity(limit = 8, scope: string[] | null = null): Promise<ActivityItem[]> {
  const sb = supabaseAdmin();
  const prayersQ = sb.from("prayer_requests").select("name, request, created_at");
  const feedbackQ = sb.from("feedback").select("name, category, rating, created_at");
  const signupsQ = scope
    ? sb.from("event_signups").select("name, role, created_at, events!inner(title, category)").in("events.category", scope)
    : sb.from("event_signups").select("name, role, created_at, events(title)");
  const [v, p, f, s] = await Promise.all([
    scope
      ? Promise.resolve({ data: [] as never[] })
      : sb.from("visitors").select("name, first_time, created_at").order("created_at", { ascending: false }).limit(limit),
    (scope ? prayersQ.in("ministry", scope) : prayersQ).order("created_at", { ascending: false }).limit(limit),
    (scope ? feedbackQ.in("ministry", scope) : feedbackQ).order("created_at", { ascending: false }).limit(limit),
    signupsQ.order("created_at", { ascending: false }).limit(limit),
  ]);

  const items: ActivityItem[] = [];
  (v.data ?? []).forEach((r) => {
    const row = r as { name: string; first_time: boolean | null; created_at: string };
    items.push({
      kind: "visitor",
      title: row.name,
      meta: row.first_time ? "First-time visitor" : "Connect card",
      created_at: row.created_at,
    });
  });
  (p.data ?? []).forEach((r) => {
    const row = r as { name: string | null; request: string; created_at: string };
    items.push({
      kind: "prayer",
      title: row.name ?? "Anonymous",
      meta: row.request.length > 80 ? row.request.slice(0, 80) + "…" : row.request,
      created_at: row.created_at,
    });
  });
  (f.data ?? []).forEach((r) => {
    const row = r as { name: string | null; category: string; rating: number | null; created_at: string };
    items.push({
      kind: "feedback",
      title: row.name ?? "Anonymous",
      meta: row.rating ? `${row.rating}★ · ${row.category}` : row.category,
      created_at: row.created_at,
    });
  });
  (s.data ?? []).forEach((r) => {
    const row = r as unknown as { name: string; role: string; created_at: string; events: { title: string } | { title: string }[] | null };
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    items.push({
      kind: "signup",
      title: row.name,
      meta: `${row.role === "volunteer" ? "Volunteering for" : "Attending"} ${event?.title ?? "(event)"}`,
      created_at: row.created_at,
    });
  });

  return items
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, limit);
}

// ---------------------------------------------------------------------------
// Member self-service queries ("My Events" / "My Forms")
//
// Linkage is best-effort: rows are matched by user_id (stamped when a
// signed-in member submits) OR by the account's email appearing in the
// row's contact/email field (covers submissions made before the account
// existed). The email match can surface a submission someone else typed
// with this member's address — acceptable for a church app.
// ---------------------------------------------------------------------------

export type MySignupRow = {
  id: string;
  role: "attendee" | "volunteer";
  occurrence_date: string | null;
  created_at: string;
  /** True when this row is user_id-linked (cancellable by the member). */
  owned: boolean;
  events: {
    slug: string;
    title: string;
    location: string;
    starts_at: string;
  } | null;
};

export async function listMySignups(userId: string, email: string): Promise<MySignupRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("event_signups")
    .select("id, role, occurrence_date, created_at, user_id, events(slug, title, location, starts_at)")
    .or(`user_id.eq.${userId},contact.ilike.${email}`)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map((row: unknown) => {
    const r = row as MySignupRow & { user_id: string | null; events: MySignupRow["events"] | MySignupRow["events"][] };
    const events = Array.isArray(r.events) ? r.events[0] ?? null : r.events;
    return { id: r.id, role: r.role, occurrence_date: r.occurrence_date, created_at: r.created_at, owned: r.user_id === userId, events };
  });
}

/** Delete one of the member's own signups. Only user_id-linked rows qualify —
 *  email-matched rows can't be cancelled (the match is too loose to act on). */
export async function cancelMySignup(signupId: string, userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin()
    .from("event_signups")
    .delete()
    .eq("id", signupId)
    .eq("user_id", userId)
    .select("id");
  if (error) throw error;
  return (data ?? []).length > 0;
}

export type MyFormItem = {
  kind: "prayer" | "feedback" | "visitor";
  title: string;
  meta: string;
  created_at: string;
};

export async function listMyForms(userId: string, email: string): Promise<MyFormItem[]> {
  const sb = supabaseAdmin();
  const [p, f, v] = await Promise.all([
    sb
      .from("prayer_requests")
      .select("request, ministry, created_at")
      .or(`user_id.eq.${userId},contact.ilike.${email}`)
      .order("created_at", { ascending: false })
      .limit(50),
    // feedback has no contact column — user_id linkage only.
    sb
      .from("feedback")
      .select("category, rating, message, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50),
    sb
      .from("visitors")
      .select("name, first_time, created_at")
      .or(`user_id.eq.${userId},email.ilike.${email}`)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  const items: MyFormItem[] = [];
  (p.data ?? []).forEach((r) => {
    const row = r as { request: string; ministry: string; created_at: string };
    items.push({
      kind: "prayer",
      title: "Prayer request",
      meta: row.request.length > 90 ? row.request.slice(0, 90) + "…" : row.request,
      created_at: row.created_at,
    });
  });
  (f.data ?? []).forEach((r) => {
    const row = r as { category: string; rating: number | null; message: string; created_at: string };
    items.push({
      kind: "feedback",
      title: `Feedback · ${row.category}`,
      meta: row.message.length > 90 ? row.message.slice(0, 90) + "…" : row.message,
      created_at: row.created_at,
    });
  });
  (v.data ?? []).forEach((r) => {
    const row = r as { name: string; first_time: boolean | null; created_at: string };
    items.push({
      kind: "visitor",
      title: row.first_time ? "I'm New Here" : "Connect card",
      meta: row.name,
      created_at: row.created_at,
    });
  });
  return items.sort((a, b) => b.created_at.localeCompare(a.created_at));
}
