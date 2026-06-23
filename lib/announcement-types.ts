export type AnnouncementCategory = "Important" | "Ministry" | "Facilities" | "Event";

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  "Important",
  "Ministry",
  "Facilities",
  "Event",
];

export const ANNOUNCEMENT_COLORS: Record<AnnouncementCategory, string> = {
  Important: "#e9787f",
  Ministry: "#7bb0ff",
  Facilities: "#aab2c6",
  Event: "#e7b84e",
};
