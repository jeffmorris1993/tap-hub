import type { ReactNode } from "react";
// Type-only import — erased at compile time, so the server-only module
// never actually loads into this (client-imported) file.
import type { PortalRole } from "../../../lib/portal-auth";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Optional badge node (e.g. a Suspense-wrapped pending count). */
  badge?: ReactNode;
};

const sw = 1.7;
const ic = { width: 20, height: 20, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export const ICONS: Record<string, ReactNode> = {
  home: (
    <svg {...ic}>
      <path d="M3 11 12 3l9 8v9a2 2 0 0 1-2 2h-4v-6h-6v6H5a2 2 0 0 1-2-2z" />
    </svg>
  ),
  inbox: (
    <svg {...ic}>
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.5 5h13l3 7v6a2 2 0 0 1-2 2h-15a2 2 0 0 1-2-2v-6z" />
    </svg>
  ),
  calendar: (
    <svg {...ic}>
      <rect x="3" y="5" width="18" height="16" rx="2.5" />
      <path d="M3 10h18M8 3v4M16 3v4" />
    </svg>
  ),
  pending: (
    <svg {...ic}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  ),
  sun: (
    <svg {...ic}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4 12H2M22 12h-2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" />
    </svg>
  ),
  kids: (
    <svg {...ic}>
      <circle cx="9" cy="8" r="2.4" />
      <circle cx="16" cy="9.5" r="1.9" />
      <path d="M4 19c0-3 2.2-4.8 5-4.8s5 1.8 5 4.8M14.5 19c0-2 .9-3.3 2.8-3.7" />
    </svg>
  ),
  bot: (
    <svg {...ic}>
      <rect x="4" y="7" width="16" height="13" rx="3" />
      <path d="M8 11h0M16 11h0M9 16h6M12 3v4" />
    </svg>
  ),
  list: (
    <svg {...ic}>
      <path d="M9 6h12M9 12h12M9 18h12M4 6h0M4 12h0M4 18h0" />
    </svg>
  ),
  signOut: (
    <svg {...ic}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
    </svg>
  ),
  menu: (
    <svg {...ic}>
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  ),
  megaphone: (
    <svg {...ic}>
      <path d="M3 11v2a2 2 0 0 0 2 2h2v3l8 3V6L7 9H5a2 2 0 0 0-2 2zM18 8a4 4 0 0 1 0 8" />
    </svg>
  ),
  doc: (
    <svg {...ic}>
      <path d="M6 3h7l5 5v13H6z" />
      <path d="M13 3v5h5M9 13h6M9 17h6" />
    </svg>
  ),
  users: (
    <svg {...ic}>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <path d="M16 6a3 3 0 0 1 0 6M21 20c0-2.5-1.5-4-3.5-4.6" />
    </svg>
  ),
  bell: (
    <svg {...ic}>
      <path d="M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6" />
      <path d="M10.3 19a2 2 0 0 0 3.4 0" />
    </svg>
  ),
};

/**
 * Role-conditional sidebar. Everyone gets the member self-service items;
 * lead adds ministry-scoped admin surfaces; pastoral adds approvals,
 * visitors, user management, and the agent.
 */
export function buildNavForRole(
  role: PortalRole,
  ministries: string[],
  badges: { pendingEvents?: ReactNode; pendingAnnouncements?: ReactNode } = {},
): NavItem[] {
  const memberItems: NavItem[] = [
    { href: "/portal/my-events", label: "My Events", icon: ICONS.calendar },
    { href: "/portal/my-forms", label: "My Forms", icon: ICONS.doc },
  ];
  const overview: NavItem = { href: "/portal", label: "Overview", icon: ICONS.home };

  if (role === "member") {
    return [overview, ...memberItems];
  }

  if (role === "lead") {
    return [
      overview,
      { href: "/portal/events", label: "Events", icon: ICONS.calendar },
      { href: "/portal/announcements", label: "Announcements", icon: ICONS.megaphone },
      { href: "/portal/submissions", label: "Inbox", icon: ICONS.inbox },
      ...(ministries.includes("Youth")
        ? [{ href: "/portal/kids-youth", label: "Kids + Youth", icon: ICONS.kids }]
        : []),
      ...memberItems,
    ];
  }

  return [
    overview,
    { href: "/portal/submissions", label: "Inbox", icon: ICONS.inbox },
    { href: "/portal/events", label: "Events", icon: ICONS.calendar },
    {
      href: "/portal/events/pending",
      label: "Pending approval",
      icon: ICONS.pending,
      badge: badges.pendingEvents,
    },
    {
      href: "/portal/announcements",
      label: "Announcements",
      icon: ICONS.megaphone,
      badge: badges.pendingAnnouncements,
    },
    { href: "/portal/kids-youth", label: "Kids + Youth", icon: ICONS.kids },
    { href: "/portal/users", label: "Users", icon: ICONS.users },
    { href: "/portal/notifications", label: "Notifications", icon: ICONS.bell },
    { href: "/portal/agent", label: "Agent", icon: ICONS.bot },
    { href: "/portal/agent-log", label: "Agent log", icon: ICONS.list },
    ...memberItems,
  ];
}
