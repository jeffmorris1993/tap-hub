import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminEventById } from "../../../../../lib/supabase/admin-queries";
import { EventForm } from "../EventForm";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const event = await getAdminEventById(id);
  if (!event) notFound();

  return (
    <div>
      <Link
        href="/admin/events"
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
      <EventForm initial={event} />
    </div>
  );
}
