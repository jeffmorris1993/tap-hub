import { requireCapability } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { CHURCH_TZ } from "../../../../lib/tz";
import { FlyerQueueCard, type FlyerQueueItem } from "./FlyerQueueCard";

export const dynamic = "force-dynamic";

/**
 * The design team's queue: every event waiting on flyer work. Visible to the
 * 'flyer' capability (and pastoral, who hold every capability implicitly).
 * Events appear here once their details are approved and a flyer was
 * requested — or when a flyer came back with change requests.
 */

type Row = {
  id: string;
  title: string;
  category: string;
  starts_at: string;
  location: string;
  all_day: boolean;
  flyer_status: "awaiting_design" | "submitted" | "rejected";
  flyer_path: string | null;
  flyer_request_notes: string | null;
  flyer_notes: string | null;
  submitted_by: string | null;
  flyer_reviewed_by: string | null;
};

function whenLabel(iso: string, allDay: boolean): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: CHURCH_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    ...(allDay ? {} : { hour: "numeric" as const, minute: "2-digit" as const }),
  });
}

export default async function FlyerQueuePage() {
  await requireCapability("flyer");

  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(
      "id, title, category, starts_at, location, all_day, flyer_status, flyer_path, " +
        "flyer_request_notes, flyer_notes, submitted_by, flyer_reviewed_by",
    )
    .in("flyer_status", ["awaiting_design", "rejected", "submitted"])
    .order("starts_at", { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as unknown as Row[];

  const toItem = (r: Row): FlyerQueueItem => ({
    ...r,
    whenLabel: whenLabel(r.starts_at, r.all_day),
  });

  const needsWork = rows.filter((r) => r.flyer_status === "awaiting_design" || r.flyer_status === "rejected");
  const inReview = rows.filter((r) => r.flyer_status === "submitted");

  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          margin: "0 0 6px",
        }}
      >
        Flyer requests
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "13.5px", fontWeight: 600, margin: "0 0 24px" }}>
        {needsWork.length === 0
          ? "Nothing waiting on design right now. 🎉"
          : `${needsWork.length} ${needsWork.length === 1 ? "event needs" : "events need"} a flyer.`}
        {inReview.length > 0 && ` ${inReview.length} with the pastors for approval.`}
      </p>

      {needsWork.length > 0 && (
        <section style={{ display: "grid", gap: "14px" }}>
          {needsWork.map((r) => (
            <FlyerQueueCard key={r.id} item={toItem(r)} />
          ))}
        </section>
      )}

      {inReview.length > 0 && (
        <section style={{ marginTop: needsWork.length > 0 ? "32px" : 0 }}>
          <h2
            style={{
              fontSize: "12px",
              fontWeight: 800,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "#6a738b",
              margin: "0 0 12px",
            }}
          >
            In review with the pastors
          </h2>
          <div style={{ display: "grid", gap: "14px" }}>
            {inReview.map((r) => (
              <FlyerQueueCard key={r.id} item={toItem(r)} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
