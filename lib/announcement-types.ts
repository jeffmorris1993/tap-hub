export type AnnouncementCategory =
  | "Youth"
  | "Sisterhood"
  | "Brotherhood"
  | "Marriage"
  | "Music"
  | "General";

export const ANNOUNCEMENT_CATEGORIES: AnnouncementCategory[] = [
  "Youth",
  "Sisterhood",
  "Brotherhood",
  "Marriage",
  "Music",
  "General",
];

export const ANNOUNCEMENT_COLORS: Record<AnnouncementCategory, string> = {
  Youth: "#4eb86b",
  Sisterhood: "#e9787f",
  Brotherhood: "#4e8de7",
  Marriage: "#b884e7",
  Music: "#e0a23f",
  General: "#aab2c6",
};
