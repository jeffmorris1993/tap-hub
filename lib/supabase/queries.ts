import "server-only";
import { supabaseAdmin } from "./server";
import type { ScheduleRow } from "../clock";
import { hasOccurrenceOnDate, type RecurrenceKind, type RecurringEventFields } from "../events-occurrence";
import { detroitNow, detroitDateIso } from "../tz";

export type EventCategory = "Worship" | "Youth" | "Community";

export type EventRow = {
  slug: string;
  title: string;
  description_long: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string;
  cost: string | null;
  allow_volunteers: boolean;
  recurrence_kind: RecurrenceKind;
  recurrence_byday: number | null;
  recurrence_until: string | null;
};

export type WeekLookaheadRow = {
  day_label: string;
  title: string;
  detail: string;
};

export type KidsLessonRow = {
  topic: string;
  reference: string;
  teacher: string;
};

export type KidsProgramRow = {
  age_group: string;
  name: string;
  detail: string;
};

export type ParentResourceRow = {
  title: string;
  sub: string;
  icon_key: string;
  url: string | null;
};

const EVENT_FIELDS =
  "slug, title, description_long, category, starts_at, ends_at, location, " +
  "cost, allow_volunteers, recurrence_kind, recurrence_byday, recurrence_until";

/** Standard schedule for a specific day_of_week (Detroit-local active-date filter). */
export async function getScheduleForDayOfWeek(dayOfWeek: number): Promise<ScheduleRow[]> {
  const sb = supabaseAdmin();
  const today = detroitDateIso();
  const { data, error } = await sb
    .from("schedule_today")
    .select("kind, label, starts_at_minutes, duration_minutes, location, active_from, active_until")
    .eq("day_of_week", dayOfWeek)
    .or(`active_from.is.null,active_from.lte.${today}`)
    .or(`active_until.is.null,active_until.gte.${today}`)
    .order("starts_at_minutes", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((r) => r.kind !== "evening")
    .map((r) => ({
      kind: r.kind,
      startsAtMinutes: r.starts_at_minutes,
      durationMinutes: r.duration_minutes,
      label: r.label,
      where: r.location,
    }));
}

/** Today's standard schedule. */
export async function getTodaySchedule(now: Date = detroitNow()): Promise<ScheduleRow[]> {
  return getScheduleForDayOfWeek(now.getDay());
}

/** Returns evening worship for today's date, or null if none scheduled. */
export async function getEveningTonight(): Promise<{ label: string; where: string; time: string } | null> {
  const sb = supabaseAdmin();
  const today = detroitNow();
  const dow = today.getDay();
  const isoDate = detroitDateIso();
  const { data, error } = await sb
    .from("schedule_today")
    .select("label, location, starts_at_minutes, active_from, active_until")
    .eq("kind", "evening")
    .eq("day_of_week", dow)
    .or(`active_from.is.null,active_from.lte.${isoDate}`)
    .or(`active_until.is.null,active_until.gte.${isoDate}`)
    .limit(1);
  if (error) throw error;
  const row = data?.[0];
  if (!row) return null;
  const h = Math.floor(row.starts_at_minutes / 60);
  const m = row.starts_at_minutes % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return { label: row.label, where: row.location, time: `${h12}:${m < 10 ? "0" + m : m} ${ampm}` };
}

export async function getWeekLookahead(): Promise<WeekLookaheadRow[]> {
  const sb = supabaseAdmin();
  const today = detroitDateIso();
  const { data, error } = await sb
    .from("week_lookahead")
    .select("day_label, title, detail")
    .or(`active_from.is.null,active_from.lte.${today}`)
    .or(`active_until.is.null,active_until.gte.${today}`)
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function listPublishedEvents(): Promise<EventRow[]> {
  // RLS already filters published + approved.
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("events")
    .select(EVENT_FIELDS)
    .eq("published", true)
    .eq("approval_status", "approved")
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as unknown as EventRow[];
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("events")
    .select(EVENT_FIELDS)
    .eq("slug", slug)
    .eq("published", true)
    .eq("approval_status", "approved")
    .limit(1);
  if (error) throw error;
  return (data?.[0] ?? null) as unknown as EventRow | null;
}

/** Events whose next computed occurrence falls on a specific date. */
export async function listEventsOnDate(dateIso: string): Promise<EventRow[]> {
  const events = await listPublishedEvents();
  return events.filter((e) => hasOccurrenceOnDate(e as RecurringEventFields, dateIso));
}

export async function getTodaysKidsLesson(): Promise<KidsLessonRow | null> {
  const sb = supabaseAdmin();
  const today = detroitDateIso();
  const { data, error } = await sb
    .from("kids_lesson")
    .select("topic, reference, teacher, lesson_date")
    .lte("lesson_date", today)
    .order("lesson_date", { ascending: false })
    .limit(1);
  if (error) throw error;
  return (data?.[0] ?? null) as KidsLessonRow | null;
}

export async function getKidsPrograms(): Promise<KidsProgramRow[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("kids_programs")
    .select("age_group, name, detail")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function getParentResources(): Promise<ParentResourceRow[]> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("parent_resources")
    .select("title, sub, icon_key, url")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
