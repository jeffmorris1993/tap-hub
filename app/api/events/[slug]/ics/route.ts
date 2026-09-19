import { NextResponse, type NextRequest } from "next/server";
import { getEventBySlug } from "../../../../../lib/supabase/queries";
import { buildEventIcs, occurrenceOnDate, type CalendarLinkOptions } from "../../../../../lib/event-calendar";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const event = await getEventBySlug(slug);
  if (!event) {
    return new NextResponse("Event not found", { status: 404 });
  }

  // ?date=YYYY-MM-DD anchors the entry on that occurrence;
  // &mode=occurrence additionally drops the recurrence rule so only that
  // single date is added. Invalid dates fall back to the series default.
  const date = request.nextUrl.searchParams.get("date");
  const mode = request.nextUrl.searchParams.get("mode");
  let opts: CalendarLinkOptions = {};
  let single = false;
  if (date) {
    const occ = occurrenceOnDate(event, date);
    if (occ) {
      single = mode === "occurrence" && event.recurrence_kind !== "none";
      opts = { occurrence: occ, mode: single ? "occurrence" : "series" };
    }
  }

  const { origin } = new URL(request.url);
  const ics = buildEventIcs(event, `${origin}/events/${event.slug}`, opts);
  const filename = single ? `${event.slug}-${date}.ics` : `${event.slug}.ics`;
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
