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
  isSunday: boolean;
};

function formatTime(mins: number): { time: string; ampm: string } {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return { time: `${h}:${m < 10 ? "0" + m : m}`, ampm };
}

/**
 * Pure today-status compute. `now` is injected so this is server-safe and unit-testable.
 * Mirrors the branching in the Claude Design prototype.
 */
export function getTodayStatus(schedule: ScheduleRow[], now: Date): TodayStatus {
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const isSunday = day === 0;

  let liveIdx = -1;
  let nextIdx = -1;
  if (isSunday) {
    schedule.forEach((s, i) => {
      if (mins >= s.startsAtMinutes && mins < s.startsAtMinutes + s.durationMinutes) {
        liveIdx = i;
      }
    });
    nextIdx = schedule.findIndex((s) => mins < s.startsAtMinutes);
  }

  let badge: TodayBadge;
  let headline: string;
  let sub: string;
  if (isSunday && liveIdx >= 0) {
    badge = "Happening Now";
    headline = schedule[liveIdx].label;
    sub = schedule[liveIdx].where;
  } else if (isSunday && nextIdx >= 0) {
    const s = schedule[nextIdx];
    const t = formatTime(s.startsAtMinutes);
    badge = "Up Next";
    headline = `${s.label} · ${t.time} ${t.ampm}`;
    sub = s.where;
  } else if (isSunday) {
    badge = "Today";
    headline = "Thanks for worshiping with us";
    sub = "See you Wednesday for Bible Class · 7 PM";
  } else {
    badge = "This Week";
    headline = "Worship Sunday · 12:00 PM";
    sub = "Prayer 10 AM · Sunday School 10:30 AM";
  }

  const rows: RowView[] = schedule.map((s, i) => {
    const t = formatTime(s.startsAtMinutes);
    let status: RowStatus = "soon";
    if (isSunday && i === liveIdx) status = "live";
    else if (isSunday && mins >= s.startsAtMinutes + s.durationMinutes) status = "done";
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
    scheduleLabel: isSunday ? "Today's Schedule · Sunday" : "This Sunday's Schedule",
    rows,
    isSunday,
  };
}

/** Seed Sunday schedule from the design — replaced by Supabase data in Phase 2. */
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
