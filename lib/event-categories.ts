// Audience-based event categories, shared with announcements. Lives in
// its own file (rather than lib/supabase/queries.ts) so client components
// like EventsList can import without pulling in `server-only`.

export type EventCategory =
  | "Youth"
  | "Sisterhood"
  | "Brotherhood"
  | "Marriage"
  | "General";

export const EVENT_CATEGORIES: EventCategory[] = [
  "Youth",
  "Sisterhood",
  "Brotherhood",
  "Marriage",
  "General",
];
