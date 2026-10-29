import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { detroitNow } from "../../../../lib/tz";
import {
  fmtDateIso,
  listOccurrences,
  minutesToLabel,
  type AttendeeType,
  type CheckinServiceRow,
} from "../../../../lib/attendance";
import { loadOverrides, loadServices } from "../../../../lib/attendance-data";
import { sendCheckinSummary } from "../../../../lib/email/checkin-summary";
import { resolveNotificationRecipients } from "../../../../lib/notification-routes";

export const dynamic = "force-dynamic";

/**
 * Sends the attendance metrics for each service occurrence once its check-in
 * window has closed. Hit by two schedulers — Supabase pg_cron every 15
 * minutes (near-real-time) and the daily Vercel cron as a self-healing
 * sweeper — which is safe because checkin_summary_sends makes every
 * occurrence send-once.
 *
 * All window math is Detroit wall-clock (minutes since midnight), matching
 * lib/attendance.ts — closes_minutes is never converted to UTC, so DST never
 * shifts a window. An occurrence whose close lands in a skipped DST hour is
 * still caught by the `occ.date < today` clause on the next day's run.
 */

function addDaysIso(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  const pad = (n: number) => (n < 10 ? "0" + n : String(n));
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lookbackDays = Number(process.env.CHECKIN_SUMMARY_LOOKBACK_DAYS ?? 3) || 3;
  const now = detroitNow();
  const pad = (n: number) => (n < 10 ? "0" + n : String(n));
  const todayIso = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const fromIso = addDaysIso(todayIso, -lookbackDays);

  const [services, overrides] = await Promise.all([loadServices(), loadOverrides()]);
  const serviceById = new Map<string, CheckinServiceRow>(services.map((s) => [s.id, s]));

  // Held occurrences in the lookback window whose check-in window has closed.
  const closed = listOccurrences(services, overrides, fromIso, todayIso, todayIso).filter((occ) => {
    if (occ.status !== "held") return false;
    const service = serviceById.get(occ.serviceId);
    if (!service) return false;
    return occ.date < todayIso || service.closes_minutes <= nowMinutes;
  });

  const sb = supabaseAdmin();
  const { data: logged, error: logErr } = await sb
    .from("checkin_summary_sends")
    .select("service_id, occurrence_date")
    .gte("occurrence_date", fromIso);
  if (logErr) {
    console.error("[checkin-summary] send-log query failed", logErr);
    return NextResponse.json({ error: logErr.message }, { status: 500 });
  }
  const alreadySent = new Set(
    (logged ?? []).map((r) => `${(r as { service_id: string }).service_id}:${(r as { occurrence_date: string }).occurrence_date}`),
  );

  let sent = 0;
  let skipped = 0;
  let skippedEmpty = 0;

  // Resolved at most once per run, and only when there's something to send.
  let recipientsCache: string[] | null = null;
  const recipients = async () => {
    if (recipientsCache === null) recipientsCache = await resolveNotificationRecipients("checkin");
    return recipientsCache;
  };

  // Sequential sends — Resend rate limits are easy to trip with Promise.all.
  for (const occ of closed) {
    if (alreadySent.has(`${occ.serviceId}:${occ.date}`)) {
      skipped += 1;
      continue;
    }
    const service = serviceById.get(occ.serviceId);
    if (!service) continue;

    const { data: rows, error: cErr } = await sb
      .from("checkins")
      .select("attendee_type")
      .eq("service_id", occ.serviceId)
      .eq("occurrence_date", occ.date);
    if (cErr) {
      console.error("[checkin-summary] checkins query failed", occ.serviceId, occ.date, cErr);
      continue;
    }
    const types = (rows ?? []).map((r) => (r as { attendee_type: AttendeeType }).attendee_type);
    const kpis = {
      total: types.length,
      members: types.filter((t) => t === "member").length,
      regulars: types.filter((t) => t === "regular").length,
      first: types.filter((t) => t === "first").length,
      returning: types.filter((t) => t === "returning").length,
    };

    // A quiet occurrence gets a log row but no email — stops retries without
    // emailing "0 check-ins" noise every week.
    if (kpis.total === 0) {
      await sb
        .from("checkin_summary_sends")
        .upsert(
          { service_id: occ.serviceId, occurrence_date: occ.date, recipients: [] },
          { onConflict: "service_id,occurrence_date" },
        );
      skippedEmpty += 1;
      continue;
    }

    const to = await recipients();
    if (to.length === 0) {
      // No one to notify (misconfiguration) — leave unlogged so it retries
      // once a recipient exists.
      console.warn("[checkin-summary] no recipients configured; will retry", occ.serviceId, occ.date);
      continue;
    }

    const ok = await sendCheckinSummary({
      to,
      serviceName: occ.serviceName,
      occurrenceDate: occ.date,
      dateLabel: fmtDateIso(occ.date),
      serviceTimeLabel: minutesToLabel(service.service_minutes),
      kpis,
    });
    if (ok) {
      sent += 1;
      await sb
        .from("checkin_summary_sends")
        .upsert(
          { service_id: occ.serviceId, occurrence_date: occ.date, recipients: to },
          { onConflict: "service_id,occurrence_date" },
        );
    }
  }

  return NextResponse.json({ ok: true, sent, skipped, skippedEmpty });
}
