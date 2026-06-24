import Link from "next/link";
import { notFound } from "next/navigation";
import { getAdminEventById, listSignupsForEvent } from "../../../../../lib/supabase/admin-queries";
import { EventForm } from "../EventForm";
import { currentUserCanApprove } from "../actions";
import { SignupsList } from "./SignupsList";

export const dynamic = "force-dynamic";

export default async function EditEvent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [event, canApprove, signups] = await Promise.all([
    getAdminEventById(id),
    currentUserCanApprove(),
    listSignupsForEvent(id),
  ]);
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
      <EventForm initial={event} canApprove={canApprove} />
      {event.accepts_rsvps || event.allow_volunteers ? (
        <SignupsList
          signups={signups}
          acceptsRsvps={event.accepts_rsvps}
          allowVolunteers={event.allow_volunteers}
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
    </div>
  );
}
