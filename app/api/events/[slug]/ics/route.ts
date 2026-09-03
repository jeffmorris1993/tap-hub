import { NextResponse, type NextRequest } from "next/server";
import { getEventBySlug } from "../../../../../lib/supabase/queries";
import { buildEventIcs } from "../../../../../lib/event-calendar";

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
  const { origin } = new URL(request.url);
  const ics = buildEventIcs(event, `${origin}/events/${event.slug}`);
  return new NextResponse(ics, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${event.slug}.ics"`,
      "Cache-Control": "no-store",
    },
  });
}
