import { listPublishedEvents } from "../../lib/supabase/queries";
import { toDisplayEvent, sortByNextOccurrence } from "../../lib/events-display";
import { EventsList } from "./EventsList";

export const revalidate = 60;

export default async function EventsPage() {
  const now = new Date();
  const events = await listPublishedEvents();
  const display = sortByNextOccurrence(events.map((e) => toDisplayEvent(e, now)));
  return <EventsList events={display} />;
}
