import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminEventById, listSignupsForEvent } from "../../../../../lib/supabase/admin-queries";
import { EventForm } from "../EventForm";
import { currentUserCanApprove } from "../actions";
import { SignupsList } from "./SignupsList";
import {
  EventCheckinCard,
  type EventCheckinWindow,
  type OccurrenceChoice,
} from "./EventCheckinCard";
import { requireLead } from "../../../../../lib/portal-auth";
import {
  loadOverrides,
  loadServices,
  loadServicesForEvent,
  loadWalkinCounts,
} from "../../../../../lib/attendance-data";
import {
  fmtDateIso,
  minutesToLabel,
  occurrenceKey,
  openServicesNow,
} from "../../../../../lib/attendance";
import { detroitDayIso, upcomingOccurrences } from "../../../../../lib/event-calendar";
import { supabaseAdmin } from "../../../../../lib/supabase/server";

export const dynamic = "force-dynamic";

/** How many future dates of a recurring event we offer to open check-in for. */
const OCCURRENCE_CHOICES = 6;

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const pu = await requireLead();
  const { id } = await params;
  const [event, canApprove, signups] = await Promise.all([
    getAdminEventById(id),
    currentUserCanApprove(),
    listSignupsForEvent(id),
  ]);
  if (!event) notFound();
  // A lead can only open events in their own ministries.
  if (pu.role !== "pastoral" && !pu.ministries.includes(event.category)) notFound();

  // Arrival check-in: existing windows for this event, plus the upcoming dates
  // that could still be opened.
  const [eventServices, services, overrides, walkinCounts] = await Promise.all([
    loadServicesForEvent(event.id),
    loadServices(),
    loadOverrides(),
    loadWalkinCounts(),
  ]);

  const openNowIds = new Set(
    openServicesNow(services, overrides).map((w) => w.service.id),
  );

  const checkinCounts = new Map<string, number>();
  if (eventServices.length > 0) {
    const { data } = await supabaseAdmin()
      .from("checkins")
      .select("service_id, occurrence_date")
      .in(
        "service_id",
        eventServices.map((s) => s.id),
      );
    for (const row of (data ?? []) as Array<{ service_id: string; occurrence_date: string }>) {
      const key = occurrenceKey(row.service_id, row.occurrence_date);
      checkinCounts.set(key, (checkinCounts.get(key) ?? 0) + 1);
    }
  }

  const checkinWindows: EventCheckinWindow[] = eventServices
    .filter((s) => s.enabled && s.service_date)
    .map((s) => {
      const date = s.service_date as string;
      const key = occurrenceKey(s.id, date);
      return {
        serviceId: s.id,
        date,
        dateLabel: fmtDateIso(date),
        opensMinutes: s.opens_minutes,
        closesMinutes: s.closes_minutes,
        opensLabel: minutesToLabel(s.opens_minutes),
        closesLabel: minutesToLabel(s.closes_minutes),
        isOpenNow: openNowIds.has(s.id),
        checkins: checkinCounts.get(key) ?? 0,
        walkins: walkinCounts.get(key) ?? 0,
      };
    });

  const occurrences: OccurrenceChoice[] = upcomingOccurrences(event, OCCURRENCE_CHOICES).map(
    (start) => {
      const date = detroitDayIso(start);
      return { date, label: fmtDateIso(date) };
    },
  );

  return (
    <div>
      <Link
        href="/portal/events"
        style={{ color: "#9aa3b8", fontSize: "12.5px", textDecoration: "none", fontWeight: 700 }}
      >
        ← All events
      </Link>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          margin: "10px 0 24px",
        }}
      >
        Edit event
      </h1>
      <EventForm
        initial={event}
        canApprove={canApprove}
        allowedCategories={pu.role === "pastoral" ? undefined : pu.ministries}
      />
      {event.accepts_rsvps || event.allow_volunteers ? (
        <SignupsList
          signups={signups}
          acceptsRsvps={event.accepts_rsvps}
          allowVolunteers={event.allow_volunteers}
          isRecurring={event.recurrence_kind !== "none"}
          eventId={event.id}
        />
      ) : (
        <section
          style={{
            marginTop: "36px",
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "18px",
            padding: "22px 24px",
            color: "#9aa3b8",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          This event is info-only — no signups are being collected.
        </section>
      )}

      <EventCheckinCard
        eventId={event.id}
        windows={checkinWindows}
        occurrences={occurrences}
      />
    </div>
  );
}
