import type { ScheduleRow } from "./clock";

export type HeroEmphasis = "live" | "warm" | "encouragement";

export type Hero = {
  badge: string;
  headline: string;
  sub: string;
  emphasis: HeroEmphasis;
};

// Short, mostly-NIV verses that feel right above a "Today at the church"
// banner. Rotated deterministically per calendar day.
const VERSES = [
  { text: "This is the day the Lord has made; rejoice and be glad in it.", ref: "Psalm 118:24" },
  { text: "Be still, and know that I am God.", ref: "Psalm 46:10" },
  { text: "The Lord bless you and keep you.", ref: "Numbers 6:24" },
  { text: "Cast all your anxiety on Him because He cares for you.", ref: "1 Peter 5:7" },
  { text: "I can do all things through Christ who strengthens me.", ref: "Philippians 4:13" },
  { text: "Trust in the Lord with all your heart; lean not on your own understanding.", ref: "Proverbs 3:5" },
  { text: "Rejoice in the Lord always. I will say it again: Rejoice!", ref: "Philippians 4:4" },
  { text: "Be strong and courageous. Do not be afraid; the Lord your God will be with you.", ref: "Joshua 1:9" },
  { text: "His mercies are new every morning; great is His faithfulness.", ref: "Lamentations 3:22-23" },
  { text: "Let everything that has breath praise the Lord.", ref: "Psalm 150:6" },
  { text: "Come to me, all you who are weary and burdened, and I will give you rest.", ref: "Matthew 11:28" },
  { text: "Above all else, guard your heart, for everything you do flows from it.", ref: "Proverbs 4:23" },
  { text: "Give thanks in all circumstances.", ref: "1 Thessalonians 5:18" },
  { text: "Where two or three gather in my name, there am I with them.", ref: "Matthew 18:20" },
];

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function pickVerse(date: Date) {
  // Stable per calendar day so a visitor sees the same verse all day long.
  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
  let hash = 0;
  for (let i = 0; i < key.length; i++) hash = ((hash * 31) + key.charCodeAt(i)) >>> 0;
  return VERSES[hash % VERSES.length];
}

function greetingForHour(hour: number): string {
  if (hour < 5) return "Late Night";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

function minutesToTime(mins: number): string {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${m < 10 ? "0" + m : m} ${ampm}`;
}

function nextDayWithSchedule(today: number): { dow: number; name: string; offset: number } {
  // Walk forward up to 7 days looking for the first day of the week that has
  // some recurring event we know about. Without per-day data, just use the
  // hardcoded weekly pattern (Mon-Fri morning prayer, Wed night class, Sun
  // morning prayer through worship). Good enough for the hero copy.
  for (let offset = 1; offset <= 7; offset++) {
    const dow = (today + offset) % 7;
    if (dow !== 6) return { dow, name: DAY_NAMES[dow], offset };
  }
  return { dow: 0, name: "Sunday", offset: 1 };
}

/**
 * Build the warm, time-aware /today hero.
 *
 * Decision tree:
 *   - no rows today  → encouragement verse + day-aware greeting
 *   - event live     → "Happening Now"
 *   - event soon     → "Coming Up" (≤30 min) or greeting + time (≤2 hr)
 *   - event later    → greeting + time
 *   - just ended     → "Thank You" + warm post-service line
 *   - end-of-day     → greeting + tomorrow preview
 */
export function buildHero(
  schedule: ScheduleRow[],
  sundayFallback: ScheduleRow[],
  now: Date,
): Hero {
  const day = now.getDay();
  const mins = now.getHours() * 60 + now.getMinutes();
  const greeting = greetingForHour(now.getHours());

  // ---- No schedule today → encouragement verse ----
  if (schedule.length === 0) {
    const verse = pickVerse(now);
    const dayName = DAY_NAMES[day];
    const main = sundayFallback.find((r) => r.kind === "worship") ?? sundayFallback[sundayFallback.length - 1];
    const sundayInvite = main
      ? `Join us tomorrow for ${main.label} at ${minutesToTime(main.startsAtMinutes)}.`
      : "";
    return {
      badge: `${greeting} · ${dayName}`,
      headline: verse.text,
      sub: day === 6 && sundayInvite ? `${verse.ref} · ${sundayInvite}` : verse.ref,
      emphasis: "encouragement",
    };
  }

  const sorted = [...schedule].sort((a, b) => a.startsAtMinutes - b.startsAtMinutes);

  // ---- Live event happening right now ----
  const live = sorted.find(
    (s) => mins >= s.startsAtMinutes && mins < s.startsAtMinutes + s.durationMinutes,
  );
  if (live) {
    return {
      badge: "Happening Now",
      headline: live.label,
      sub: live.where,
      emphasis: "live",
    };
  }

  // ---- Event coming up later today ----
  const upcoming = sorted.find((s) => mins < s.startsAtMinutes);
  if (upcoming) {
    const minutesAway = upcoming.startsAtMinutes - mins;
    if (minutesAway <= 30) {
      return {
        badge: "Starting Soon",
        headline: `${upcoming.label} in ${minutesAway} min`,
        sub: upcoming.where,
        emphasis: "live",
      };
    }
    return {
      badge: greeting,
      headline: `${upcoming.label} at ${minutesToTime(upcoming.startsAtMinutes)}`,
      sub: minutesAway <= 180 ? `${upcoming.where} · See you soon!` : upcoming.where,
      emphasis: "warm",
    };
  }

  // ---- All of today's events are done — warm post-service copy ----
  const lastEvent = sorted[sorted.length - 1];
  const endMins = lastEvent.startsAtMinutes + lastEvent.durationMinutes;
  const minutesAgo = mins - endMins;

  // Just ended (within an hour)
  if (minutesAgo <= 60) {
    if (day === 0) {
      return {
        badge: "Thank You",
        headline: "Hope you were blessed today",
        sub: "Drive safely home. See you Wednesday at 7 PM for Bible Class.",
        emphasis: "warm",
      };
    }
    if (day === 3) {
      return {
        badge: "Thank You",
        headline: "Thanks for joining Bible Class",
        sub: "Keep the Word close this week. See you Sunday at 12 PM.",
        emphasis: "warm",
      };
    }
    if (day === 1 && lastEvent.kind === "special") {
      return {
        badge: "Thank You",
        headline: "Thanks for praying with us tonight",
        sub: "Rest well. Morning Prayer tomorrow at 7 AM via conference call.",
        emphasis: "warm",
      };
    }
    return {
      badge: "Thank You",
      headline: "Glad you joined us this morning",
      sub: `Have a blessed ${DAY_NAMES[day]}.`,
      emphasis: "warm",
    };
  }

  // A few hours after — still warm but pivot toward "rest of the day"
  if (minutesAgo <= 240) {
    if (day === 0) {
      return {
        badge: greeting,
        headline: "Hope you enjoyed worship",
        sub: "Rest well · Bible Class Wednesday at 7 PM",
        emphasis: "warm",
      };
    }
    return {
      badge: greeting,
      headline: `Hope your ${DAY_NAMES[day]} is full of grace`,
      sub: "We'll see you again soon.",
      emphasis: "warm",
    };
  }

  // End of day — encourage rest, hint at tomorrow. Always make it
  // explicit that the named event is *tomorrow*, not later tonight, so
  // the hero doesn't read as "happening soon" to a visitor glancing at
  // it.
  const tomorrow = nextDayWithSchedule(day);
  let tomorrowSub: string;
  if (tomorrow.dow === 0) {
    const worship = sundayFallback.find((r) => r.kind === "worship");
    tomorrowSub = worship
      ? `Join us tomorrow for Sunday Worship at ${minutesToTime(worship.startsAtMinutes)}`
      : "Join us tomorrow for Sunday Worship";
  } else if (tomorrow.dow === 3) {
    tomorrowSub = "Join us tomorrow for Wednesday Bible Class · 7 PM";
  } else {
    tomorrowSub = `Join us tomorrow for ${tomorrow.name} Morning Prayer at 7 AM via conference call`;
  }
  return {
    badge: greeting,
    headline: "Rest well tonight",
    sub: tomorrowSub,
    emphasis: "warm",
  };
}
