import "server-only";
import { supabaseAdmin } from "./server";
import type { ScheduleRow } from "../clock";
import type { RecurrenceKind, RecurringEventFields } from "../events-occurrence";
import { isSeriesOver, occurrenceOnDate } from "../event-calendar";
import { detroitNow, detroitDateIso, fmtDetroitTime } from "../tz";

export { EVENT_CATEGORIES, type EventCategory } from "../event-categories";
import type { EventCategory } from "../event-categories";

export type EventRow = {
  slug: string;
  title: string;
  description_long: string;
  category: EventCategory;
  starts_at: string;
  ends_at: string | null;
  location: string;
  cost: string | null;
  accepts_rsvps: boolean;
  allow_volunteers: boolean;
  registration_url: string | null;
  registration_label: string | null;
  recurrence_kind: RecurrenceKind;
  recurrence_byday: number | null;
  recurrence_until: string | null;
  /** Custom signup questions jsonb — parse with parseSignupQuestions, never cast. */
  signup_questions: unknown;
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
  "cost, accepts_rsvps, allow_volunteers, registration_url, registration_label, " +
  "recurrence_kind, recurrence_byday, recurrence_until, signup_questions";

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

function minutesToTimeLabel(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m < 10 ? "0" + m : m} ${ampm}`;
}

// Highlight order for derived week rows — a day's headline is worship or
// Bible class, not the prayer call that also happens that morning.
const WEEK_KIND_PRIORITY: Record<string, number> = {
  worship: 0,
  midweek: 1,
  special: 2,
  evening: 3,
  sunday_school: 4,
  fellowship: 5,
  prayer: 6,
};

/**
 * "Coming Up This Week", derived instead of hand-curated: for each of the
 * next 6 days (tomorrow onward), event occurrences plus standing-schedule
 * highlights. Rows that repeat on 5+ days of the week (the weekday prayer
 * call) are routine, not highlights, and are skipped; each day is capped
 * at 2 items with events listed first.
 */
export async function getDerivedWeekLookahead(now: Date = detroitNow()): Promise<WeekLookaheadRow[]> {
  const sb = supabaseAdmin();
  const [scheduleRes, events] = await Promise.all([
    sb
      .from("schedule_today")
      .select("day_of_week, kind, label, starts_at_minutes, location, active_from, active_until"),
    listPublishedEvents(),
  ]);
  if (scheduleRes.error) throw scheduleRes.error;
  const scheduleRows = scheduleRes.data ?? [];

  const perWeekCounts = new Map<string, number>();
  for (const r of scheduleRows) {
    const key = `${r.label}@${r.starts_at_minutes}`;
    perWeekCounts.set(key, (perWeekCounts.get(key) ?? 0) + 1);
  }

  const out: WeekLookaheadRow[] = [];
  for (let offset = 1; offset <= 6; offset++) {
    const day = new Date(now);
    day.setDate(day.getDate() + offset);
    const dateIso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
    const dayLabel = day.toLocaleDateString("en-US", { weekday: "short" });

    const items: WeekLookaheadRow[] = [];
    for (const e of events) {
      const occ = occurrenceOnDate(e as RecurringEventFields, dateIso);
      if (occ) {
        items.push({
          day_label: dayLabel,
          title: e.title,
          detail: `${fmtDetroitTime(occ.toISOString())} · ${e.location}`,
        });
      }
    }

    const standing = scheduleRows
      .filter((r) => r.day_of_week === day.getDay())
      .filter((r) => !r.active_from || r.active_from <= dateIso)
      .filter((r) => !r.active_until || r.active_until >= dateIso)
      .filter((r) => (perWeekCounts.get(`${r.label}@${r.starts_at_minutes}`) ?? 0) < 5)
      .sort(
        (a, b) =>
          (WEEK_KIND_PRIORITY[a.kind] ?? 9) - (WEEK_KIND_PRIORITY[b.kind] ?? 9) ||
          a.starts_at_minutes - b.starts_at_minutes,
      );
    for (const r of standing) {
      items.push({
        day_label: dayLabel,
        title: r.label,
        detail: `${minutesToTimeLabel(r.starts_at_minutes)} · ${r.location}`,
      });
    }

    out.push(...items.slice(0, 2));
  }
  return out;
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
  // Archive finished events (one-offs in the past, ended recurrence windows).
  // Must be computed via the occurrence engine, not a SQL starts_at bound —
  // a weekly series that started months ago is still current.
  const todayIso = detroitDateIso();
  const rows = (data ?? []) as unknown as EventRow[];
  return rows.filter((e) => !isSeriesOver(e as RecurringEventFields, todayIso));
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

/** Events whose next computed occurrence falls on a specific date.
 *  Pass `now` to also drop instances whose end time has already passed. */
export async function listEventsOnDate(dateIso: string, now?: Date): Promise<EventRow[]> {
  const events = await listPublishedEvents();
  return events.filter((e) => {
    const occ = occurrenceOnDate(e as RecurringEventFields, dateIso);
    if (!occ) return false;
    // Drop instances whose daily end time has already passed — "Also Today"
    // shouldn't keep showing a 9–5 program after 5 PM.
    if (now && e.ends_at) {
      const durationMs = new Date(e.ends_at).getTime() - new Date(e.starts_at).getTime();
      if (durationMs > 0 && occ.getTime() + durationMs < now.getTime()) return false;
    }
    return true;
  });
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
