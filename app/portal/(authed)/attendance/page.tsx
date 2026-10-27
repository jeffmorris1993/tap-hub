import { requirePastoral } from "../../../../lib/portal-auth";
import {
  consecutiveMissStreak,
  fmtDateIso,
  heldSundayDates,
  listOccurrences,
  minutesToLabel,
  occurrenceKey,
  type FollowUpStatus,
} from "../../../../lib/attendance";
import { loadAttendanceDataset } from "../../../../lib/attendance-data";
import { detroitDateIso, fmtDetroitTime } from "../../../../lib/tz";
import {
  AttendanceView,
  type CheckinView,
  type FlagView,
  type GuestView,
  type OccurrenceView,
  type PersonView,
  type ServiceView,
  type TrendBar,
} from "./AttendanceView";

export const dynamic = "force-dynamic";

const TABS = ["overview", "history", "follow", "guests", "services"] as const;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  await requirePastoral();
  const { tab } = await searchParams;
  const initialTab = (TABS as readonly string[]).includes(tab ?? "") ? (tab as string) : "overview";

  const { services, overrides, attendees, checkins, followUps } = await loadAttendanceDataset();
  const todayIso = detroitDateIso();

  // Date range for derived occurrences: from the earliest data point (first
  // check-in or a one-off's date) through next week, so upcoming one-offs
  // and this week's services show on the Services tab.
  let fromIso = todayIso;
  for (const c of checkins) if (c.occurrence_date < fromIso) fromIso = c.occurrence_date;
  for (const s of services) {
    if (s.kind === "oneoff" && s.service_date && s.service_date < fromIso) fromIso = s.service_date;
  }
  let toIso = addDays(todayIso, 7);
  for (const s of services) {
    if (s.kind === "oneoff" && s.service_date && s.service_date > toIso) toIso = s.service_date;
  }

  const counts = new Map<string, number>();
  for (const c of checkins) {
    const key = occurrenceKey(c.service_id, c.occurrence_date);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const serviceById = new Map(services.map((s) => [s.id, s]));

  const occurrences: OccurrenceView[] = listOccurrences(services, overrides, fromIso, toIso, todayIso)
    .map((o) => ({
      key: occurrenceKey(o.serviceId, o.date),
      serviceId: o.serviceId,
      serviceName: o.serviceName,
      date: o.date,
      dateLabel: fmtDateIso(o.date),
      timeLabel: minutesToLabel(o.serviceMinutes),
      status: o.status,
      count: counts.get(occurrenceKey(o.serviceId, o.date)) ?? 0,
      kind: serviceById.get(o.serviceId)?.kind ?? "recurring",
    }))
    .sort((a, b) => (a.date === b.date ? a.timeLabel.localeCompare(b.timeLabel) : a.date < b.date ? 1 : -1));

  const attendeeById = new Map(attendees.map((a) => [a.id, a]));
  const byAttendee = new Map<string, typeof checkins>();
  for (const c of checkins) {
    const list = byAttendee.get(c.attendee_id) ?? [];
    list.push(c);
    byAttendee.set(c.attendee_id, list);
  }

  const occLabel = (serviceId: string, date: string) => {
    const name = serviceById.get(serviceId)?.name ?? "Service";
    return `${name} · ${fmtDateIso(date)}`;
  };

  const checkinViews: CheckinView[] = checkins.map((c) => {
    const a = attendeeById.get(c.attendee_id);
    return {
      id: c.id,
      attendeeId: c.attendee_id,
      name: a ? `${a.first_name} ${a.last_name}` : "Unknown",
      type: c.attendee_type,
      occKey: occurrenceKey(c.service_id, c.occurrence_date),
      serviceLabel: occLabel(c.service_id, c.occurrence_date),
      timeLabel: fmtDetroitTime(c.checked_in_at),
      ts: c.checked_in_at,
    };
  });

  const heldSundays = heldSundayDates(services, overrides, fromIso, todayIso);
  const sundayServiceIds = new Set(
    services.filter((s) => s.kind === "recurring" && s.day_of_week === 0).map((s) => s.id),
  );

  const trend: TrendBar[] = heldSundays.slice(-8).map((date) => {
    let total = 0;
    for (const c of checkins) {
      if (c.occurrence_date === date && sundayServiceIds.has(c.service_id)) total++;
    }
    return { date, label: shortDate(date), total };
  });

  const contactLabelOf = (a: (typeof attendees)[number]) => {
    const raw = a.phone ? formatPhone(a.phone) : a.email ?? "";
    if (!raw) return "Not provided";
    return a.contact_consent ? raw : "Did not agree to contact";
  };

  const people: Record<string, PersonView> = {};
  const flags: FlagView[] = [];
  const guests: GuestView[] = [];
  const followUpByAttendee = new Map(followUps.map((f) => [f.attendee_id, f]));

  for (const a of attendees) {
    const mine = (byAttendee.get(a.id) ?? [])
      .slice()
      .sort((x, y) => (x.checked_in_at < y.checked_in_at ? 1 : -1));
    const dates = mine.map((c) => c.occurrence_date).sort();
    const firstDate = dates[0] ?? null;
    const attendedSet = new Set(dates);
    const eligible = firstDate ? heldSundays.filter((d) => d >= firstDate) : [];
    const attended = eligible.filter((d) => attendedSet.has(d));

    people[a.id] = {
      id: a.id,
      name: `${a.first_name} ${a.last_name}`,
      type: a.attendee_type,
      firstLabel: firstDate ? fmtDateIso(firstDate) : "—",
      total: mine.length,
      attended: attended.length,
      eligible: eligible.length,
      hasContact: a.contact_consent && Boolean(a.phone || a.email),
      contactLabel: contactLabelOf(a),
      prefLabel: a.contact_consent && a.preferred_contact ? cap(a.preferred_contact) : "—",
      rows: mine.map((c) => ({
        service: occLabel(c.service_id, c.occurrence_date),
        time: fmtDetroitTime(c.checked_in_at),
      })),
    };

    if (a.attendee_type === "member" && firstDate) {
      const { streak, latestMiss } = consecutiveMissStreak(heldSundays, attendedSet, firstDate);
      if (streak >= 3) {
        const stored = followUpByAttendee.get(a.id);
        const stale = stored?.miss_anchor && latestMiss && latestMiss > stored.miss_anchor;
        const status: FollowUpStatus = stale ? "needs" : (stored?.status ?? "needs");
        const last = mine[0];
        flags.push({
          attendeeId: a.id,
          name: `${a.first_name} ${a.last_name}`,
          miss: streak,
          lastLabel: last ? occLabel(last.service_id, last.occurrence_date) : "—",
          status,
        });
      }
    }

    if ((a.attendee_type === "first" || a.attendee_type === "returning") && mine.length > 0) {
      guests.push({
        attendeeId: a.id,
        name: `${a.first_name} ${a.last_name}`,
        visits: mine.length,
        firstLabel: fmtDateIso(dates[0]),
        lastLabel: fmtDateIso(dates[dates.length - 1]),
        returned: mine.length > 1,
        contact: contactLabelOf(a),
        hasContact: a.contact_consent && Boolean(a.phone || a.email),
        pref: a.contact_consent && a.preferred_contact ? cap(a.preferred_contact) : "—",
      });
    }
  }

  flags.sort((a, b) => b.miss - a.miss);
  guests.sort((a, b) => (a.lastLabel === b.lastLabel ? 0 : a.lastLabel < b.lastLabel ? 1 : -1));

  const serviceViews: ServiceView[] = services.map((s) => ({
    id: s.id,
    name: s.name,
    kind: s.kind,
    dayOfWeek: s.day_of_week,
    serviceDate: s.service_date,
    serviceMinutes: s.service_minutes,
    opensMinutes: s.opens_minutes,
    closesMinutes: s.closes_minutes,
    enabled: s.enabled,
  }));

  const host = process.env.NEXT_PUBLIC_SITE_URL ?? "https://tap-hub.nehtemple.org";

  return (
    <AttendanceView
      initialTab={initialTab}
      nfcLink={`${host.replace(/\/$/, "")}/?checkin`}
      occurrences={occurrences}
      checkins={checkinViews}
      people={people}
      flags={flags}
      guests={guests}
      trend={trend}
      services={serviceViews}
    />
  );
}

function addDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${m}/${d}`;
}

function formatPhone(digits: string): string {
  if (digits.length === 10) return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  if (digits.length === 11 && digits.startsWith("1")) return formatPhone(digits.slice(1));
  return digits;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
