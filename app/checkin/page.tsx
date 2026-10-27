import type { Metadata } from "next";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";
import {
  DOW_LABEL,
  fmtDateIso,
  minutesToLabel,
  nextOpening,
  openServiceNow,
} from "../../lib/attendance";
import { loadOverrides, loadServices } from "../../lib/attendance-data";
import { CheckinFlow } from "./CheckinFlow";

export const metadata: Metadata = {
  title: "Check In · Nehemiah's Temple",
  description: "Let us know you're here for service.",
};

// Whether check-in is open depends on the current Detroit time — never cache.
export const dynamic = "force-dynamic";

export default async function CheckinPage() {
  const [services, overrides] = await Promise.all([loadServices(), loadOverrides()]);
  const window = openServiceNow(services, overrides);

  let closed: { nextLabel: string | null; schedule: string[] } | null = null;
  if (!window) {
    const next = nextOpening(services, overrides);
    closed = {
      nextLabel: next
        ? `Check-in opens ${fmtDateIso(next.date)} at ${minutesToLabel(next.service.opens_minutes)} for ${next.service.name}.`
        : null,
      schedule: services
        .filter((s) => s.kind === "recurring" && s.enabled && s.day_of_week != null)
        .map(
          (s) =>
            `${s.name} · ${DOW_LABEL[s.day_of_week!]}s, check-in ${minutesToLabel(s.opens_minutes)}–${minutesToLabel(s.closes_minutes)}`,
        ),
    };
  }

  return (
    <PhoneShell>
      <BackBar
        href="/"
        title="Check In"
        subtitle={window ? window.service.name : "Nehemiah's Temple"}
      />
      <CheckinFlow
        window={
          window
            ? {
                serviceName: window.service.name,
                whenLabel: `${fmtDateIso(window.date)} · ${minutesToLabel(window.service.service_minutes)}`,
              }
            : null
        }
        closed={closed}
      />
    </PhoneShell>
  );
}
