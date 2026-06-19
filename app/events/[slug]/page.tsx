import { notFound } from "next/navigation";
import { getEventBySlug } from "../../../lib/supabase/queries";
import { toDisplayEvent } from "../../../lib/events-display";
import { EventDetailView } from "./EventDetailView";

export const revalidate = 60;

export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) notFound();
  return <EventDetailView event={toDisplayEvent(event)} />;
}
