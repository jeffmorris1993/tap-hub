export type ScheduleKind =
  | "prayer"
  | "sunday_school"
  | "fellowship"
  | "worship"
  | "evening"
  | "midweek"
  | "special";

export type ScheduleRow = {
  kind: ScheduleKind;
  /** Minutes past midnight (e.g. 10:00 AM = 600) */
  startsAtMinutes: number;
  durationMinutes: number;
  label: string;
  where: string;
};

export type RowStatus = "live" | "soon" | "done";
export type RowView = {
  label: string;
  where: string;
  time: string;
  ampm: string;
  status: RowStatus;
};

export type TodayBadge = "Happening Now" | "Up Next" | "Today" | "This Week";

export type TodayStatus = {
  badge: TodayBadge;
  headline: string;
  sub: string;
  scheduleLabel: string;
  rows: RowView[];
  hasScheduleToday: boolean;
};

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function formatTime(mins: number): { time: string; ampm: string } {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { time: `${h}:${m < 10 ? "0" + m : m}`, ampm };
}

/**
 * Day-agnostic today-status compute. `schedule` is the rows for the current
 * day_of_week (already filtered). `now` is injected so this is server-safe
 * and unit-testable.
 */
export function getTodayStatus(schedule: ScheduleRow[], now: Date): TodayStatus {
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const dayName = DAY_NAMES[day];
  const isSunday = day === 0;

  // Sort by start time so liveIdx/nextIdx logic is correct regardless of
  // insertion order.
  const sorted = [...schedule].sort((a, b) => a.startsAtMinutes - b.startsAtMinutes);

  let liveIdx = -1;
  let nextIdx = -1;
  sorted.forEach((s, i) => {
    if (mins >= s.startsAtMinutes && mins < s.startsAtMinutes + s.durationMinutes) {
      liveIdx = i;
    }
  });
  nextIdx = sorted.findIndex((s) => mins < s.startsAtMinutes);

  let badge: TodayBadge;
  let headline: string;
  let sub: string;
  if (sorted.length > 0 && liveIdx >= 0) {
    badge = "Happening Now";
    headline = sorted[liveIdx].label;
    sub = sorted[liveIdx].where;
  } else if (sorted.length > 0 && nextIdx >= 0) {
    const s = sorted[nextIdx];
    const t = formatTime(s.startsAtMinutes);
    badge = "Up Next";
    headline = `${s.label} · ${t.time} ${t.ampm}`;
    sub = s.where;
  } else if (sorted.length > 0) {
    badge = "Today";
    headline = isSunday ? "Thanks for worshiping with us" : `That's a wrap on ${dayName}`;
    sub = isSunday ? "See you Wednesday for Bible Class · 7 PM" : "See you tomorrow.";
  } else {
    badge = "This Week";
    headline = "Worship Sunday · 12:00 PM";
    sub = "Prayer 10 AM · Sunday School 10:30 AM";
  }

  const rows: RowView[] = sorted.map((s, i) => {
    const t = formatTime(s.startsAtMinutes);
    let status: RowStatus = "soon";
    if (i === liveIdx) status = "live";
    else if (mins >= s.startsAtMinutes + s.durationMinutes) status = "done";
    return {
      label: s.label,
      where: s.where,
      time: t.time,
      ampm: t.ampm,
      status,
    };
  });

  return {
    badge,
    headline,
    sub,
    scheduleLabel: sorted.length > 0 ? `Today's Schedule · ${dayName}` : "This Sunday's Schedule",
    rows,
    hasScheduleToday: sorted.length > 0,
  };
}

/** Used as an offline/SSR fallback only. Live data comes from Supabase. */
export const SEED_SUNDAY_SCHEDULE: ScheduleRow[] = [
  { kind: "prayer", startsAtMinutes: 600, durationMinutes: 30, label: "Morning Prayer", where: "Main Sanctuary" },
  { kind: "sunday_school", startsAtMinutes: 630, durationMinutes: 60, label: "Christian Education", where: "Sunday School · all ages" },
  { kind: "fellowship", startsAtMinutes: 690, durationMinutes: 30, label: "Fellowship", where: "Fellowship Hall · coffee & connect" },
  { kind: "worship", startsAtMinutes: 720, durationMinutes: 105, label: "Worship Service", where: "Main Sanctuary" },
];

export const SEED_WEEK_LOOKAHEAD = [
  { day: "Wed", label: "Bible Class", detail: "7:00 PM · Main Sanctuary" },
  { day: "Fri", label: "Ignite Youth Night", detail: "7:00 PM · Youth Hall" },
  { day: "Sat", label: "Men's Prayer Breakfast", detail: "8:30 AM · Fellowship Hall" },
];
