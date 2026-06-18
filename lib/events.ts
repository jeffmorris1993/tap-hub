export type EventCategory = "Worship" | "Youth" | "Community";

export type EventRow = {
  slug: string;
  title: string;
  category: EventCategory;
  month: string; // 3-letter uppercase
  day: string; // padded
  whenText: string;
  where: string;
  longDescription: string;
  /** Hue used for the placeholder hero gradient (replace with cover image in Phase 2). */
  hue: number;
};

// Seed data from the design. Phase 2 replaces with Supabase reads.
export const SEED_EVENTS: EventRow[] = [
  {
    slug: "summer-discovery-2026",
    title: "Summer Discovery Program 2026",
    category: "Community",
    month: "JUL",
    day: "13",
    whenText: "July 13–17, 2026 · 9 AM–1 PM",
    where: "Family Life Center",
    longDescription:
      "A week of faith, learning, and fun for kids and youth. Daily worship, crafts, games, Bible lessons, and lifelong friendships. Volunteers needed for check-in, crafts, snacks, and group leaders.",
    hue: 38,
  },
  {
    slug: "a-night-of-worship",
    title: "A Night of Worship",
    category: "Worship",
    month: "FEB",
    day: "27",
    whenText: "Friday, Feb 27, 2026 · 7 PM",
    where: "Main Sanctuary",
    longDescription:
      "An evening set apart for praise, prayer, and encountering the presence of God together as one family. Come early for prayer at 6:30 PM. Worship team and tech volunteers welcome.",
    hue: 220,
  },
  {
    slug: "ignite-youth-takeover",
    title: "Ignite Youth Takeover",
    category: "Youth",
    month: "MAR",
    day: "14",
    whenText: "Saturday, Mar 14, 2026 · 5 PM",
    where: "Youth Hall",
    longDescription:
      "A high-energy night just for our youth — worship, food, games, fellowship, and a powerful word. Bring a friend! Adult chaperones and kitchen help needed.",
    hue: 6,
  },
  {
    slug: "community-outreach-day",
    title: "Community Outreach Day",
    category: "Community",
    month: "APR",
    day: "11",
    whenText: "Saturday, Apr 11, 2026 · 10 AM",
    where: "Madison Heights",
    longDescription:
      "Serving our Madison Heights neighbors with food, prayer, and the tangible love of Christ. We need volunteers for food distribution, setup, prayer teams, and cleanup.",
    hue: 140,
  },
  {
    slug: "resurrection-sunday",
    title: "Resurrection Sunday",
    category: "Worship",
    month: "APR",
    day: "05",
    whenText: "Sunday, Apr 5, 2026 · 12 PM",
    where: "Main Sanctuary",
    longDescription:
      "Celebrate the risen Savior with us. A glorious morning of worship, the Word, and family. Greeters, ushers, and hospitality volunteers make the day special.",
    hue: 280,
  },
];

export function getEvent(slug: string): EventRow | undefined {
  return SEED_EVENTS.find((e) => e.slug === slug);
}
