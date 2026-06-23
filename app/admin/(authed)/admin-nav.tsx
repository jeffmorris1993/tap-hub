import type { ReactNode } from "react";

export type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  /** Optional badge count (e.g. pending approvals). Hidden when undefined or 0. */
  badge?: number;
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
};

export function buildNav(pendingCount: number): NavItem[] {
  return [
    { href: "/admin", label: "Overview", icon: ICONS.home },
    { href: "/admin/submissions", label: "Inbox", icon: ICONS.inbox },
    { href: "/admin/events", label: "Events", icon: ICONS.calendar },
    {
      href: "/admin/events/pending",
      label: "Pending approval",
      icon: ICONS.pending,
      badge: pendingCount > 0 ? pendingCount : undefined,
    },
    { href: "/admin/announcements", label: "Announcements", icon: ICONS.megaphone },
    { href: "/admin/today", label: "Today & Week", icon: ICONS.sun },
    { href: "/admin/kids-youth", label: "Kids + Youth", icon: ICONS.kids },
    { href: "/admin/agent", label: "Agent", icon: ICONS.bot },
    { href: "/admin/agent-log", label: "Agent log", icon: ICONS.list },
  ];
}
