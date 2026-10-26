import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { detroitDayIso, nextOccurrence } from "../../../../lib/event-calendar";
import type { RecurringEventFields } from "../../../../lib/events-occurrence";
import { sendEventReminder } from "../../../../lib/email/event-reminder";
import { CHURCH_TZ } from "../../../../lib/tz";
import type { SignupRole } from "../../../../lib/event-signup-forms";

export const dynamic = "force-dynamic";

/**
 * Hourly Vercel Cron (vercel.json): emails everyone signed up for an event
 * occurrence starting within the next REMINDER_HOURS_BEFORE hours (default
 * 24). The event_reminder_sends log makes reruns idempotent — each signup
 * gets at most one reminder per occurrence.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EventRowLite = RecurringEventFields & {
  id: string;
  slug: string;
  title: string;
  location: string;
};

type SignupLite = {
  id: string;
  name: string;
  contact: string;
  role: SignupRole;
  occurrence_date: string | null;
};

function fmtWhen(occ: Date, allDay: boolean | null | undefined): string {
  const day = occ.toLocaleDateString("en-US", {
    timeZone: CHURCH_TZ,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  if (allDay) return day;
  const time = occ.toLocaleTimeString("en-US", {
    timeZone: CHURCH_TZ,
    hour: "numeric",
    minute: "2-digit",
  });
  return `${day} · ${time}`;
}

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const hours = Number(process.env.REMINDER_HOURS_BEFORE ?? 24) || 24;
  const now = new Date();
  const windowEnd = now.getTime() + hours * 3600_000;

  const sb = supabaseAdmin();
  const { data: events, error } = await sb
    .from("events")
    .select(
      "id, slug, title, location, starts_at, ends_at, " +
        "recurrence_kind, recurrence_interval, recurrence_bydays, recurrence_count, recurrence_until, all_day",
    )
    .eq("published", true)
    .eq("approval_status", "approved");
  if (error) {
    console.error("[cron-reminders] events query failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  let skipped = 0;

  for (const ev of (events ?? []) as unknown as EventRowLite[]) {
    const occ = nextOccurrence(ev, now);
    if (!occ) continue;
    // Only occurrences inside the reminder window. The hourly cadence means
    // each occurrence enters the window exactly once; the sent-log below
    // covers retries and manual runs.
    if (occ.getTime() > windowEnd) continue;
    const occDate = detroitDayIso(occ);

    // Series-level signups (occurrence_date null) get a reminder for every
    // occurrence; dated signups only for their date.
    const { data: signups, error: sErr } = await sb
      .from("event_signups")
      .select("id, name, contact, role, occurrence_date")
      .eq("event_id", ev.id)
      .or(`occurrence_date.eq.${occDate},occurrence_date.is.null`);
    if (sErr) {
      console.error("[cron-reminders] signups query failed", ev.slug, sErr);
      continue;
    }

    const emailable = ((signups ?? []) as SignupLite[]).filter((s) => EMAIL_RE.test(s.contact.trim()));
    if (emailable.length === 0) continue;

    const { data: logged } = await sb
      .from("event_reminder_sends")
      .select("signup_id")
      .eq("occurrence_date", occDate)
      .in(
        "signup_id",
        emailable.map((s) => s.id),
      );
    const alreadySent = new Set((logged ?? []).map((r) => (r as { signup_id: string }).signup_id));

    const whenText = fmtWhen(occ, ev.all_day);
    // Sequential sends — Resend rate limits are easy to trip with Promise.all.
    for (const s of emailable) {
      if (alreadySent.has(s.id)) {
        skipped += 1;
        continue;
      }
      const ok = await sendEventReminder({
        to: s.contact.trim(),
        event: { slug: ev.slug, title: ev.title, location: ev.location },
        signup: { name: s.name, role: s.role },
        occurrenceDate: occDate,
        whenText,
      });
      if (ok) {
        sent += 1;
        await sb
          .from("event_reminder_sends")
          .upsert({ signup_id: s.id, occurrence_date: occDate }, { onConflict: "signup_id,occurrence_date" });
      }
    }
  }

  return NextResponse.json({ ok: true, sent, skipped });
}
