import Link from "next/link";
import { EventForm } from "../EventForm";
import { currentUserCanApprove } from "../actions";
import { requireLead } from "../../../../../lib/portal-auth";

export const dynamic = "force-dynamic";

export default async function NewEvent() {
  const pu = await requireLead();
  const canApprove = await currentUserCanApprove();
  const allowedCategories = pu.role === "pastoral" ? undefined : pu.ministries;
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
        New event
      </h1>
      <EventForm canApprove={canApprove} allowedCategories={allowedCategories} />
    </div>
  );
}
