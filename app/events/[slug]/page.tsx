import { notFound } from "next/navigation";
import { getEventBySlug } from "../../../lib/supabase/queries";
import { toDisplayEvent, toDisplayOccurrence, type DisplayEvent } from "../../../lib/events-display";
import {
  detroitDayIso,
  nextOccurrence,
  occurrenceOnDate,
  upcomingOccurrences,
} from "../../../lib/event-calendar";
import { CHURCH_TZ } from "../../../lib/tz";
import { getPortalUser } from "../../../lib/portal-auth";
import { flyerPublicUrl } from "../../../lib/flyers";
import { EventDetailView, type OccurrenceChoice, type SelectedOccurrence } from "./EventDetailView";

/** og:image = the approved flyer, so a shared Facebook/iMessage link previews
 *  the actual artwork instead of a generic card. */
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) return {};
  const description = event.description_long.replace(/\s+/g, " ").trim().slice(0, 160);
  const flyer =
    event.flyer_path && event.flyer_status === "approved" ? flyerPublicUrl(event.flyer_path) : null;
  return {
    title: event.title,
    description,
    openGraph: {
      title: event.title,
      description,
      ...(flyer ? { images: [{ url: flyer }] } : {}),
    },
  };
}

// Reading ?date= makes this page dynamic (request-time rendering); the
// queries behind it are cheap, and it keeps every occurrence link exact.

export default async function EventDetail({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ date?: string | string[] }>;
}) {
  const [{ slug }, { date }] = await Promise.all([params, searchParams]);
  const event = await getEventBySlug(slug);
  if (!event) notFound();

  // Read-only session peek (no redirect): signed-in members get their
  // name/email pre-filled on the signup form.
  const pu = await getPortalUser().catch(() => null);

  const now = new Date();

  // Resolve the requested occurrence; bogus, off-pattern, or past dates
  // fall back to the next upcoming occurrence.
  let selectedStart: Date | null = null;
  const requested = typeof date === "string" ? date : undefined;
  if (requested) {
    const occ = occurrenceOnDate(event, requested);
    if (occ && occ.getTime() >= now.getTime()) selectedStart = occ;
  }
  if (!selectedStart) selectedStart = nextOccurrence(event, now);

  const occurrence: SelectedOccurrence | null = selectedStart
    ? {
        date: detroitDayIso(selectedStart),
        iso: selectedStart.toISOString(),
        label: selectedStart.toLocaleDateString("en-US", {
          timeZone: CHURCH_TZ,
          weekday: "short",
          month: "short",
          day: "numeric",
        }),
      }
    : null;

  // Upcoming dates for the occurrence switcher (recurring events only).
  const choices: OccurrenceChoice[] =
    event.recurrence_kind === "none"
      ? []
      : upcomingOccurrences(event, 4, now).map((d) => ({
          date: detroitDayIso(d),
          label: d.toLocaleDateString("en-US", { timeZone: CHURCH_TZ, month: "short", day: "numeric" }),
        }));

  // Anchor the card display on the selected occurrence so the date chip and
  // whenText match the date the visitor tapped.
  const display: DisplayEvent = selectedStart
    ? toDisplayOccurrence(event, selectedStart, now)
    : toDisplayEvent(event, now);

  return (
    <EventDetailView
      event={display}
      occurrence={occurrence}
      choices={choices}
      signedIn={!!pu}
      prefill={
        pu
          ? { name: pu.profile?.full_name ?? "", contact: pu.email ?? "" }
          : undefined
      }
    />
  );
}
