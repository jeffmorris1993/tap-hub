import "server-only";

/**
 * Pushes published events onto the church's Google Calendar.
 *
 * Setup:
 *   1. Share the target calendar with the service account email
 *      (GCP_SERVICE_ACCOUNT_EMAIL / the JSON key's client_email) with
 *      "Make changes to events".
 *   2. Set GOOGLE_CALENDAR_ID (the ...@group.calendar.google.com id).
 *
 * Best-effort like the Chat pushes: a missing GOOGLE_CALENDAR_ID, auth
 * failure, or API error is logged and swallowed — the portal action that
 * triggered the sync always succeeds on its own terms.
 */

import { supabaseAdmin } from "./supabase/server";
import { getGoogleAccessToken } from "./google-auth";
import { buildRrule, calendarTimes, detroitDayIso } from "./event-calendar";
import { CHURCH_TZ } from "./tz";
import type { RecurringEventFields } from "./events-occurrence";

const CALENDAR_SCOPE = "https://www.googleapis.com/auth/calendar.events";
const API_BASE = "https://www.googleapis.com/calendar/v3/calendars";

type CalendarEventRow = RecurringEventFields & {
  id: string;
  slug: string;
  title: string;
  description_long: string;
  location: string;
  google_calendar_event_id: string | null;
};

const EVENT_SELECT =
  "id, slug, title, description_long, location, starts_at, ends_at, " +
  "recurrence_kind, recurrence_interval, recurrence_bydays, recurrence_count, recurrence_until, all_day, " +
  "google_calendar_event_id";

function siteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? "https://tap-hub-theta.vercel.app";
}

function plusOneDay(dayIso: string): string {
  const d = new Date(`${dayIso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}

async function loadRow(eventId: string): Promise<CalendarEventRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select(EVENT_SELECT)
    .eq("id", eventId)
    .limit(1);
  if (error) {
    console.error("[google-calendar] event lookup failed", error.message);
    return null;
  }
  return (data?.[0] as unknown as CalendarEventRow) ?? null;
}

function buildBody(row: CalendarEventRow): Record<string, unknown> {
  // Anchor at the series start (not the next occurrence) so the RRULE
  // expands the whole series from its true first instance.
  const seriesStart = new Date(row.starts_at);
  const { start, end } = calendarTimes(row, { occurrence: seriesStart });
  let rrule = buildRrule(row, seriesStart);
  if (rrule && row.all_day && row.recurrence_until) {
    // All-day Google events require a DATE-valued UNTIL, not a UTC datetime.
    rrule = rrule.replace(/UNTIL=[0-9TZ]+/, `UNTIL=${row.recurrence_until.replace(/-/g, "")}`);
  }
  const startEnd = row.all_day
    ? {
        start: { date: detroitDayIso(start) },
        // Google's all-day end date is exclusive.
        end: { date: plusOneDay(detroitDayIso(end)) },
      }
    : {
        start: { dateTime: start.toISOString(), timeZone: CHURCH_TZ },
        end: { dateTime: end.toISOString(), timeZone: CHURCH_TZ },
      };
  return {
    summary: row.title,
    description: `${row.description_long}\n\n${siteUrl()}/events/${row.slug}`,
    location: row.location,
    ...startEnd,
    ...(rrule ? { recurrence: [`RRULE:${rrule}`] } : { recurrence: [] }),
  };
}

async function storeGoogleId(eventId: string, googleId: string | null): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("events")
    .update({ google_calendar_event_id: googleId })
    .eq("id", eventId);
  if (error) console.error("[google-calendar] couldn't store calendar id", error.message);
}

/** Insert or update the event on the church calendar. Call after publish/edit. */
export async function syncEventToCalendar(eventId: string): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return;
  try {
    const row = await loadRow(eventId);
    if (!row) return;
    const token = await getGoogleAccessToken([CALENDAR_SCOPE], "google-calendar");
    if (!token) return;
    const body = JSON.stringify(buildBody(row));
    const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };
    const base = `${API_BASE}/${encodeURIComponent(calendarId)}/events`;

    if (row.google_calendar_event_id) {
      const res = await fetch(`${base}/${encodeURIComponent(row.google_calendar_event_id)}`, {
        method: "PATCH",
        headers,
        body,
      });
      if (res.ok) return;
      // The calendar entry is gone (deleted by hand) — fall through to re-insert.
      if (res.status !== 404 && res.status !== 410) {
        console.error("[google-calendar] events.patch failed", res.status, await res.text());
        return;
      }
    }

    const res = await fetch(base, { method: "POST", headers, body });
    if (!res.ok) {
      console.error("[google-calendar] events.insert failed", res.status, await res.text());
      return;
    }
    const created = (await res.json()) as { id?: string };
    if (created.id) await storeGoogleId(eventId, created.id);
  } catch (err) {
    console.error("[google-calendar] sync threw", err);
  }
}

/** Remove the event from the church calendar. Call on unpublish/reject/delete. */
export async function removeEventFromCalendar(eventId: string): Promise<void> {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;
  if (!calendarId) return;
  try {
    const row = await loadRow(eventId);
    if (!row?.google_calendar_event_id) return;
    const token = await getGoogleAccessToken([CALENDAR_SCOPE], "google-calendar");
    if (!token) return;
    const res = await fetch(
      `${API_BASE}/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(row.google_calendar_event_id)}`,
      { method: "DELETE", headers: { Authorization: `Bearer ${token}` } },
    );
    // Already gone counts as removed.
    if (!res.ok && res.status !== 404 && res.status !== 410) {
      console.error("[google-calendar] events.delete failed", res.status, await res.text());
      return;
    }
    await storeGoogleId(eventId, null);
  } catch (err) {
    console.error("[google-calendar] remove threw", err);
  }
}
