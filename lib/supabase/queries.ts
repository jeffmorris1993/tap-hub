import "server-only";
import { supabaseAdmin } from "./server";
import type { ScheduleRow } from "../clock";

export type EventCategory = "Worship" | "Youth" | "Community";

export type EventRow = {
  slug: string;
  title: string;
  description_long: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string;
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

export async function getSundaySchedule(): Promise<ScheduleRow[]> {
  const sb = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await sb
    .from("schedule_today")
    .select("kind, label, starts_at_minutes, duration_minutes, location, active_from, active_until")
    .eq("day_of_week", 0)
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

/** Returns evening worship for today's date, or null if none scheduled. */
export async function getEveningTonight(): Promise<{ label: string; where: string; time: string } | null> {
  const sb = supabaseAdmin();
  const today = new Date();
  const dow = today.getDay();
  const isoDate = today.toISOString().slice(0, 10);
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
  const today = new Date().toISOString().slice(0, 10);
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
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("events")
    .select("slug, title, description_long, category, starts_at, ends_at, location")
    .eq("published", true)
    .order("starts_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as EventRow[];
}

export async function getEventBySlug(slug: string): Promise<EventRow | null> {
  const sb = supabaseAdmin();
  const { data, error } = await sb
    .from("events")
    .select("slug, title, description_long, category, starts_at, ends_at, location")
    .eq("slug", slug)
    .eq("published", true)
    .limit(1);
  if (error) throw error;
  return (data?.[0] ?? null) as EventRow | null;
}

export async function getTodaysKidsLesson(): Promise<KidsLessonRow | null> {
  const sb = supabaseAdmin();
  const today = new Date().toISOString().slice(0, 10);
  // Latest lesson_date <= today.
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
