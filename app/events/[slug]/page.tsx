import { notFound } from "next/navigation";
import { getEvent } from "../../../lib/events";
import { EventDetailView } from "./EventDetailView";

export default async function EventDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const event = getEvent(slug);
  if (!event) notFound();
  return <EventDetailView event={event} />;
}
