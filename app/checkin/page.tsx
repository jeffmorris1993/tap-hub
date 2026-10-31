import type { Metadata } from "next";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import {
  DOW_LABEL,
  fmtDateIso,
  minutesToLabel,
  nextOpening,
  openServicesNow,
  type OpenWindow,
} from "../../lib/attendance";
import { loadOverrides, loadServices } from "../../lib/attendance-data";
import { CheckinFlow, type CheckinWindowView } from "./CheckinFlow";

export const metadata: Metadata = {
  title: "Check In · Nehemiah's Temple",
  description: "Let us know you're here for service.",
};

// Whether check-in is open depends on the current Detroit time — never cache.
export const dynamic = "force-dynamic";

function toView(w: OpenWindow): CheckinWindowView {
  return {
    serviceId: w.service.id,
    serviceName: w.service.name,
    whenLabel: `${fmtDateIso(w.date)} · ${minutesToLabel(w.service.service_minutes)}`,
  };
}

export default async function CheckinPage({
  searchParams,
}: {
  /** `s` pins one window — the QR on an event's display screen carries it. */
  searchParams: Promise<{ s?: string }>;
}) {
  const [{ s }, services, overrides] = await Promise.all([
    searchParams,
    loadServices(),
    loadOverrides(),
  ]);

  // Events get their own one-off windows, so more than one can be open at
  // once (a Saturday event overlapping a service). A pinned `s` wins; two or
  // more open windows with nothing pinned means we have to ask.
  const open = openServicesNow(services, overrides);
  const pinned = s ? open.find((w) => w.service.id === s) : undefined;
  // A stale or bogus `s` falls through to the closed screen rather than
  // silently checking someone into the wrong thing.
  const window = pinned ?? (s ? undefined : open.length === 1 ? open[0] : undefined);
  const choices = window ? [] : s ? [] : open.map(toView);

  let closed: { nextLabel: string | null; schedule: string[] } | null = null;
  if (!window && choices.length === 0) {
    const next = nextOpening(services, overrides);
    closed = {
      nextLabel: next
        ? `Check-in opens ${fmtDateIso(next.date)} at ${minutesToLabel(next.service.opens_minutes)} for ${next.service.name}.`
        : null,
      schedule: services
        .filter((s2) => s2.kind === "recurring" && s2.enabled && s2.day_of_week != null)
        .map(
          (s2) =>
            `${s2.name} · ${DOW_LABEL[s2.day_of_week!]}s, check-in ${minutesToLabel(s2.opens_minutes)}–${minutesToLabel(s2.closes_minutes)}`,
        ),
    };
  }

  const subtitle = window
    ? window.service.name
    : choices.length > 0
      ? "Choose where you are"
      : "Nehemiah's Temple";

  return (
    <PhoneShell>
      <BackBar href="/" title="Check In" subtitle={subtitle} />
      <CheckinFlow
        window={window ? toView(window) : null}
        choices={choices}
        closed={closed}
      />
    </PhoneShell>
  );
}
