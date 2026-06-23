import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { listPublishedEvents } from "./supabase/queries";
import { nextOccurrence, type RecurringEventFields } from "./events-occurrence";
import { CHURCH_TZ, detroitNow } from "./tz";
import {
  ANNOUNCEMENT_CATEGORIES,
  ANNOUNCEMENT_COLORS,
  type AnnouncementCategory,
} from "./announcement-types";

export { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_COLORS };
export type { AnnouncementCategory };

export type Announcement = {
  /** Stable id for keys. `manual:<uuid>` or `event:<slug>`. */
  id: string;
  kind: "manual" | "event";
  category: AnnouncementCategory;
  title: string;
  body: string;
  /** Display label (e.g. "Begins Sun, Mar 1 · 10:30 AM"). */
  dateLabel: string;
  /** Timestamp used for sorting non-pinned items, newest events first. */
  sortDate: string;
  pinned: boolean;
  link?: { href: string; label: string };
  /** Optional inline metadata shown under the body (event details). */
  meta?: { location?: string; cost?: string | null };
};

type ManualRow = {
  id: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  date_label: string | null;
  expires_at: string | null;
  pinned: boolean;
  published: boolean;
  link_url: string | null;
  action_label: string | null;
  created_at: string;
};

function fmtEventDateLabel(starts_at: string, ends_at: string | null): string {
  const start = new Date(starts_at);
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: CHURCH_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
  const parts = fmt.formatToParts(start);
  const get = (t: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === t)?.value ?? "";
  const date = `${get("weekday")}, ${get("month")} ${get("day")}`;
  const time = `${get("hour")}:${get("minute")} ${get("dayPeriod")}`;
  if (ends_at) {
    const end = new Date(ends_at);
    const sameDay = new Intl.DateTimeFormat("en-US", { timeZone: CHURCH_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(start) ===
      new Intl.DateTimeFormat("en-US", { timeZone: CHURCH_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(end);
    if (sameDay) {
      const endTime = new Intl.DateTimeFormat("en-US", {
        timeZone: CHURCH_TZ,
        hour: "numeric",
        minute: "2-digit",
      }).format(end);
      return `${date} · ${time}–${endTime}`;
    }
  }
  return `${date} · ${time}`;
}

export async function listAnnouncements(): Promise<Announcement[]> {
  const sb = supabaseAdmin();
  const nowIso = new Date().toISOString();

  const [manualRes, events] = await Promise.all([
    sb
      .from("announcements")
      .select(
        "id, category, title, body, date_label, expires_at, pinned, published, link_url, action_label, created_at",
      )
      .eq("published", true)
      .eq("approval_status", "approved")
      .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
      .order("pinned", { ascending: false })
      .order("created_at", { ascending: false }),
    listPublishedEvents(),
  ]);

  let manualRows: ManualRow[] = [];
  if (manualRes.error) {
    // Swallow "table not found" so the build / first page load succeeds
    // when the migration hasn't been applied yet. Other errors still
    // bubble.
    const code = (manualRes.error as { code?: string }).code;
    if (code === "PGRST205" || code === "42P01") {
      console.warn("[announcements] announcements table missing — run the migration");
    } else {
      throw manualRes.error;
    }
  } else {
    manualRows = (manualRes.data ?? []) as ManualRow[];
  }

  const manual: Announcement[] = manualRows.map((r) => ({
    id: `manual:${r.id}`,
    kind: "manual",
    category: r.category,
    title: r.title,
    body: r.body,
    dateLabel: r.date_label ?? "",
    sortDate: r.created_at,
    pinned: r.pinned,
    link: r.link_url
      ? { href: r.link_url, label: r.action_label ?? "Learn more" }
      : undefined,
  }));

  // Event-derived announcements: include each published event whose next
  // occurrence is today or later. Show "until the day of the event" by
  // filtering on nextOccurrence — once the start time has passed we stop
  // surfacing the event in announcements (the events page still holds it
  // for the rest of the day with its "Live"/"Done" badges).
  const now = detroitNow();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const fromEvents: Announcement[] = events.flatMap((e) => {
    // Skip events that have already kicked off. For a one-time event the
    // nextOccurrence check below catches it; for a recurring series we
    // need this explicit gate so a multi-week program doesn't keep
    // announcing itself every day after it starts. Once an event is
    // "ongoing" it lives on the Events page, not the Announcements tab.
    const firstStart = new Date(e.starts_at);
    if (firstStart.getTime() <= now.getTime()) return [];

    const next = nextOccurrence(e as RecurringEventFields, todayStart);
    if (!next) return [];
    const startIso = next.toISOString();
    const endIso = e.ends_at && e.recurrence_kind === "none" ? e.ends_at : null;
    return [
      {
        id: `event:${e.slug}`,
        kind: "event",
        category: "Event",
        title: e.title,
        body: e.description_long,
        dateLabel: fmtEventDateLabel(startIso, endIso),
        sortDate: startIso,
        pinned: false,
        link: e.accepts_rsvps
          ? { href: `/events/${e.slug}`, label: "Sign up" }
          : { href: `/events/${e.slug}`, label: "Event details" },
        meta: {
          location: e.location,
          cost: e.cost,
        },
      },
    ];
  });

  // Combine: pinned manual first, then everything else sorted by date.
  // Manual items use created_at as sort key; events use the next start.
  // Sort the non-pinned tail by sortDate ascending so the next event up
  // appears first (matches what people expect to see).
  const pinned = manual.filter((a) => a.pinned);
  const rest = [...manual.filter((a) => !a.pinned), ...fromEvents].sort((a, b) => {
    // Events: ascending by start (soonest first).
    // Manual: descending by created_at (newest first).
    // Mix them by date ascending — close-to-today wins.
    return a.sortDate.localeCompare(b.sortDate);
  });

  // Events bias: a brand-new manual announcement should rank near the
  // top even if its sortDate (created_at) is in the past. Bring manual
  // items posted in the last 14 days to the front of the non-pinned
  // tail.
  const recentMs = 14 * 24 * 60 * 60 * 1000;
  const fresh = rest.filter(
    (a) => a.kind === "manual" && Date.now() - Date.parse(a.sortDate) < recentMs,
  );
  const older = rest.filter((a) => !(a.kind === "manual" && Date.now() - Date.parse(a.sortDate) < recentMs));

  return [...pinned, ...fresh, ...older];
}

export function filterByCategory(items: Announcement[], category: string): Announcement[] {
  if (!category || category === "All") return items;
  return items.filter((a) => a.category === category);
}
