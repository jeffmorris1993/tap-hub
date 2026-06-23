import "server-only";
import { supabaseAdmin } from "./server";

export type DashboardCounts = {
  visitors: number;
  feedback: number;
  prayers: number;
  signups: number;
  publishedEvents: number;
  pendingEvents: number;
  recentVisitors24h: number;
};

export async function getDashboardCounts(): Promise<DashboardCounts> {
  const sb = supabaseAdmin();
  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const [v, f, p, s, e, ep, vRecent] = await Promise.all([
    sb.from("visitors").select("*", { count: "exact", head: true }),
    sb.from("feedback").select("*", { count: "exact", head: true }),
    sb.from("prayer_requests").select("*", { count: "exact", head: true }),
    sb.from("event_signups").select("*", { count: "exact", head: true }),
    sb
      .from("events")
      .select("*", { count: "exact", head: true })
      .eq("published", true)
      .eq("approval_status", "approved"),
    sb.from("events").select("*", { count: "exact", head: true }).eq("approval_status", "pending"),
    sb.from("visitors").select("*", { count: "exact", head: true }).gte("created_at", since24h),
  ]);
  return {
    visitors: v.count ?? 0,
    feedback: f.count ?? 0,
    prayers: p.count ?? 0,
    signups: s.count ?? 0,
    publishedEvents: e.count ?? 0,
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
  name: string | null;
  message: string;
  created_at: string;
};

export async function listFeedback(limit = 100): Promise<FeedbackRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("feedback")
    .select("id, rating, category, name, message, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
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
  created_at: string;
};

export async function listPrayers(limit = 100): Promise<PrayerRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("prayer_requests")
    .select("id, name, contact, request, confidential, prayer_wall, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return data ?? [];
}

export type SignupRow = {
  id: string;
  event_id: string;
  name: string;
  contact: string;
  role: "attendee" | "volunteer";
  created_at: string;
  events: { slug: string; title: string } | null;
};

export async function listSignups(limit = 200): Promise<SignupRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("event_signups")
    .select("id, event_id, name, contact, role, created_at, events(slug, title)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return (data ?? []).map((row: unknown) => {
    const r = row as SignupRow & { events: SignupRow["events"] | SignupRow["events"][] };
    const events = Array.isArray(r.events) ? r.events[0] ?? null : r.events;
    return { ...r, events };
  });
}

export type AdminEventRow = {
  id: string;
  slug: string;
  title: string;
  category: "Worship" | "Youth" | "Community";
  starts_at: string;
  ends_at: string | null;
  location: string;
  description_long: string;
  cost: string | null;
  accepts_rsvps: boolean;
  allow_volunteers: boolean;
  published: boolean;
  approval_status: "draft" | "pending" | "approved" | "rejected";
  approval_notes: string | null;
  submitted_by: string | null;
  reviewed_by: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
  recurrence_kind: "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly";
  recurrence_byday: number | null;
  recurrence_until: string | null;
};

const ADMIN_EVENT_FIELDS =
  "id, slug, title, category, starts_at, ends_at, location, description_long, " +
  "cost, accepts_rsvps, allow_volunteers, published, approval_status, approval_notes, " +
  "submitted_by, reviewed_by, submitted_at, reviewed_at, recurrence_kind, recurrence_byday, recurrence_until";

export async function listAllEvents(): Promise<AdminEventRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(ADMIN_EVENT_FIELDS)
    .order("starts_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as AdminEventRow[];
}

export async function listPendingEvents(): Promise<AdminEventRow[]> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(ADMIN_EVENT_FIELDS)
    .eq("approval_status", "pending")
    .order("submitted_at", { ascending: true });
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
