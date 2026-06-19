import { listPublishedEvents } from "../../lib/supabase/queries";
import { toDisplayEvent } from "../../lib/events-display";
import { EventsList } from "./EventsList";

export const revalidate = 60;

export default async function EventsPage() {
  const events = await listPublishedEvents();
  const display = events.map(toDisplayEvent);
  return <EventsList events={display} />;
}
