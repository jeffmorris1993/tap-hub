export type AnnouncementCategory = "Ministry" | "Facilities" | "Event";

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  "Ministry",
  "Facilities",
  "Event",
];

export const ANNOUNCEMENT_COLORS: Record<AnnouncementCategory, string> = {
  Ministry: "#7bb0ff",
  Facilities: "#aab2c6",
  Event: "#e7b84e",
};
