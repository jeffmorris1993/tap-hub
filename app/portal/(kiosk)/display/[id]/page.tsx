import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { requireLead } from "../../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../../lib/supabase/server";
import {
  loadOccurrenceCounts,
  loadOverrides,
  loadServiceById,
  loadServices,
} from "../../../../../lib/attendance-data";
import {
  fmtDateIso,
  minutesToLabel,
  openServicesNow,
} from "../../../../../lib/attendance";
import { detroitDateIso, detroitNow } from "../../../../../lib/tz";
import { qrSvg } from "../../../../../lib/qr";
import { DisplayView } from "./DisplayView";

export const metadata: Metadata = {
  title: "Check-in display · Nehemiah's Temple",
  robots: { index: false, follow: false },
};

// The live count and whether the window is open both depend on "now".
export const dynamic = "force-dynamic";

export default async function DisplayPage({ params }: { params: Promise<{ id: string }> }) {
  const pu = await requireLead();
  const { id } = await params;

  const service = await loadServiceById(id);
  if (!service) notFound();

  // An event's window is only visible to someone who can manage that event —
  // the same rule as /portal/events/[id].
  type OwningEvent = { id: string; title: string; category: string };
  let event: OwningEvent | null = null;
  if (service.event_id) {
    const { data } = await supabaseAdmin()
      .from("events")
      .select("id, title, category")
      .eq("id", service.event_id)
      .maybeSingle();
    event = (data ?? null) as OwningEvent | null;
    if (!event) notFound();
    if (pu.role !== "pastoral" && !pu.ministries.includes(event.category)) notFound();
  }

  // A one-off (every event window) displays its own date; a standing service
  // displays today, which is the only day a kiosk is ever showing it.
  const occurrenceDate = service.service_date ?? detroitDateIso();

  const [{ checkins, walkins }, services, overrides] = await Promise.all([
    loadOccurrenceCounts(service.id, occurrenceDate),
    loadServices(),
    loadOverrides(),
  ]);

  const isOpen = openServicesNow(services, overrides).some((w) => w.service.id === service.id);
  const nowMinutes = detroitNow().getHours() * 60 + detroitNow().getMinutes();
  const windowLabel = isOpen
    ? `Check-in open until ${minutesToLabel(service.closes_minutes)}`
    : !service.enabled
      ? "Check-in is closed"
      : occurrenceDate > detroitDateIso()
        ? `Opens ${fmtDateIso(occurrenceDate)} at ${minutesToLabel(service.opens_minutes)}`
        : nowMinutes < service.opens_minutes
          ? `Opens at ${minutesToLabel(service.opens_minutes)}`
          : `Closed at ${minutesToLabel(service.closes_minutes)}`;

  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://tap-hub.nehtemple.org").replace(
    /\/$/,
    "",
  );
  const checkinUrl = `${siteUrl}/checkin?s=${service.id}`;
  const typedUrl = siteUrl.replace(/^https?:\/\//, "");

  return (
    <DisplayView
      serviceId={service.id}
      occurrenceDate={occurrenceDate}
      name={service.name}
      windowLabel={windowLabel}
      isOpen={isOpen}
      qrSvg={qrSvg(checkinUrl)}
      typedUrl={typedUrl}
      checkins={checkins}
      walkins={walkins}
      exitHref={event ? `/portal/events/${event.id}` : "/portal/attendance?tab=services"}
    />
  );
}
