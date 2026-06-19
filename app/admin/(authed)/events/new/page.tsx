import Link from "next/link";
import { EventForm } from "../EventForm";

export const dynamic = "force-dynamic";

export default function NewEvent() {
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
        New event
      </h1>
      <EventForm />
    </div>
  );
}
