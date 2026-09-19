import { listPublishedEvents } from "../../lib/supabase/queries";
import { toDisplayOccurrences, sortOccurrences } from "../../lib/events-display";
import { EventsList } from "./EventsList";

export const revalidate = 30;

export default async function EventsPage() {
  const now = new Date();
  const events = await listPublishedEvents();
  // Recurring series expand into one card per upcoming date, so a weekly
  // small group shows each time it meets instead of a single "next date".
  const display = sortOccurrences(events.flatMap((e) => toDisplayOccurrences(e, now)));
  return <EventsList events={display} />;
}
