// The notification kinds, as plain data.
//
// This lives apart from lib/notification-routes.ts because that module is
// `server-only`: it reaches Supabase and reads env to resolve recipients. The
// portal's settings UI renders one card per kind from a client component, so it
// needs NOTIFICATION_KINDS as a *runtime* value — importing that from a
// server-only module fails the client build. (The old editor got away with
// `import type { NotificationKind }` only because TypeScript erases it.)
//
// No imports, no "server-only": both sides read this file.

export const NOTIFICATION_KINDS = ["prayer", "feedback", "checkin"] as const;
export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotificationKindConfig = {
  kind: NotificationKind;
  /** Card heading. Displayed uppercase; stored in sentence case. */
  title: string;
  description: string;
  /**
   * Submissions only the pastoral team should normally read. Adds the
   * "Confidential" badge, and warns when a custom list reaches outside
   * pastoral.
   */
  confidential: boolean;
};

/**
 * Drives the three cards, in display order. Adding a fourth kind is one entry
 * here plus widening the notification_routes check constraint.
 */
export const NOTIFICATION_KIND_CONFIG: readonly NotificationKindConfig[] = [
  {
    kind: "prayer",
    title: "Prayer requests",
    description: "Confidential prayer requests submitted from the feedback page.",
    confidential: true,
  },
  {
    kind: "feedback",
    title: "Feedback",
    description: "Ratings and comments submitted from the feedback page.",
    confidential: false,
  },
  {
    kind: "checkin",
    title: "Check-in summaries",
    description: "Attendance numbers emailed after each service's check-in window closes.",
    confidential: false,
  },
];
