"use server";

import { randomBytes } from "crypto";
import { headers } from "next/headers";
import { supabaseAdmin } from "../../lib/supabase/server";
import { fmtDetroitTime } from "../../lib/tz";
import { openServiceNow, type AttendeeType, type CheckinServiceRow } from "../../lib/attendance";
import {
  allowAttempt,
  loadOverrides,
  loadServices,
  sha256Hex,
  type AttendeeRow,
} from "../../lib/attendance-data";

export type CheckinOutcome =
  | {
      ok: true;
      status: "checked_in" | "already";
      firstName: string;
      serviceName: string;
      checkedInAtLabel: string;
      attendeeType: AttendeeType;
      /** Present on the first successful register/find — store in localStorage. */
      attendeeId?: string;
      token?: string;
    }
  | { ok: false; error: string; code?: "closed" | "not_found" };

const CLOSED: CheckinOutcome = {
  ok: false,
  code: "closed",
  error: "Check-in isn't open right now.",
};

const GENERIC_FAIL: CheckinOutcome = {
  ok: false,
  error: "Something went wrong on our end. Try again in a moment.",
};

/** The open window is always re-derived server-side; the client is never trusted. */
async function currentWindow(): Promise<{ service: CheckinServiceRow; date: string } | null> {
  const [services, overrides] = await Promise.all([loadServices(), loadOverrides()]);
  return openServiceNow(services, overrides);
}

/**
 * Insert the check-in for an attendee into the open window. Dedupe is
 * DB-enforced (unique constraint); a duplicate reports the original time.
 * A first-time guest checking in again is upgraded to returning.
 */
async function performCheckin(
  attendee: AttendeeRow,
  window: { service: CheckinServiceRow; date: string },
): Promise<CheckinOutcome> {
  const sb = supabaseAdmin();

  const { data: priorRows, error: priorError } = await sb
    .from("checkins")
    .select("id, occurrence_date, service_id, checked_in_at")
    .eq("attendee_id", attendee.id);
  if (priorError) {
    console.error("[checkin] prior lookup failed", priorError);
    return GENERIC_FAIL;
  }
  const prior = priorRows ?? [];
  const existing = prior.find(
    (c) => c.service_id === window.service.id && c.occurrence_date === window.date,
  );
  if (existing) {
    return {
      ok: true,
      status: "already",
      firstName: attendee.first_name,
      serviceName: window.service.name,
      checkedInAtLabel: fmtDetroitTime(existing.checked_in_at as string),
      attendeeType: attendee.attendee_type,
    };
  }

  let type: AttendeeType = attendee.attendee_type;
  if (type === "first" && prior.length > 0) {
    type = "returning";
    await sb.from("attendees").update({ attendee_type: "returning" }).eq("id", attendee.id);
  }

  const { data: inserted, error } = await sb
    .from("checkins")
    .insert({
      attendee_id: attendee.id,
      service_id: window.service.id,
      occurrence_date: window.date,
      attendee_type: type,
    })
    .select("checked_in_at")
    .single();
  if (error) {
    // 23505 = unique violation: a concurrent tap already checked them in.
    if (error.code === "23505") {
      return {
        ok: true,
        status: "already",
        firstName: attendee.first_name,
        serviceName: window.service.name,
        checkedInAtLabel: fmtDetroitTime(new Date().toISOString()),
        attendeeType: type,
      };
    }
    console.error("[checkin] insert failed", error);
    return GENERIC_FAIL;
  }

  return {
    ok: true,
    status: "checked_in",
    firstName: attendee.first_name,
    serviceName: window.service.name,
    checkedInAtLabel: fmtDetroitTime(inserted.checked_in_at as string),
    attendeeType: type,
  };
}

async function newDeviceToken(attendeeId: string): Promise<string | null> {
  const token = randomBytes(32).toString("hex");
  const { error } = await supabaseAdmin()
    .from("checkin_devices")
    .insert({ token_hash: sha256Hex(token), attendee_id: attendeeId });
  if (error) {
    console.error("[checkin] device insert failed", error);
    return null;
  }
  return token;
}

/** One-tap check-in for a device that has checked in before. */
export async function quickCheckin(input: { token: string }): Promise<CheckinOutcome> {
  const token = typeof input.token === "string" ? input.token.trim() : "";
  if (!token || token.length > 200) {
    return { ok: false, code: "not_found", error: "We couldn't find your check-in on this phone." };
  }

  const window = await currentWindow();
  if (!window) return CLOSED;

  const sb = supabaseAdmin();
  const hash = sha256Hex(token);
  const { data: device, error } = await sb
    .from("checkin_devices")
    .select("token_hash, attendee_id, attendees(*)")
    .eq("token_hash", hash)
    .maybeSingle();
  if (error) {
    console.error("[checkin] device lookup failed", error);
    return GENERIC_FAIL;
  }
  const attendee = (device?.attendees ?? null) as AttendeeRow | null;
  if (!attendee) {
    return { ok: false, code: "not_found", error: "We couldn't find your check-in on this phone." };
  }

  await sb
    .from("checkin_devices")
    .update({ last_seen_at: new Date().toISOString() })
    .eq("token_hash", hash);

  return performCheckin(attendee, window);
}

export type RegisterCheckinInput = {
  firstName: string;
  lastName: string;
  attendeeType: AttendeeType;
  phone?: string;
  email?: string;
  preferredContact?: "text" | "call" | "email";
  contactConsent?: boolean;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** First check-in on this phone: create the attendee + device, then check in. */
export async function registerAndCheckin(input: RegisterCheckinInput): Promise<CheckinOutcome> {
  const first = input.firstName?.trim() ?? "";
  const last = input.lastName?.trim() ?? "";
  const type = input.attendeeType;
  if (type !== "member" && type !== "regular" && type !== "first" && type !== "returning") {
    return { ok: false, error: "Please choose Member, Regular Attendee, First-Time Guest, or Returning Guest." };
  }
  if (!first || !last) return { ok: false, error: "Please enter your first and last name." };
  if (first.length > 80 || last.length > 80) {
    return { ok: false, error: "That name looks too long — use the name you go by." };
  }

  const guest = type === "first" || type === "returning";
  const phone = guest ? (input.phone ?? "").replace(/\D/g, "").slice(0, 15) : "";
  const email = guest ? (input.email ?? "").trim().toLowerCase().slice(0, 200) : "";
  if (email && !EMAIL_RE.test(email)) {
    return { ok: false, error: "That email doesn't look right — check it and try again." };
  }
  const pref =
    guest && (input.preferredContact === "text" || input.preferredContact === "call" || input.preferredContact === "email")
      ? input.preferredContact
      : null;

  const window = await currentWindow();
  if (!window) return CLOSED;

  const { data: attendee, error } = await supabaseAdmin()
    .from("attendees")
    .insert({
      first_name: first,
      last_name: last,
      attendee_type: type,
      phone: phone || null,
      email: email || null,
      preferred_contact: pref,
      contact_consent: guest && input.contactConsent === true,
    })
    .select("*")
    .single();
  if (error) {
    console.error("[checkin] attendee insert failed", error);
    return GENERIC_FAIL;
  }

  const token = await newDeviceToken(attendee.id as string);
  const result = await performCheckin(attendee as AttendeeRow, window);
  if (result.ok && token) {
    return { ...result, attendeeId: attendee.id as string, token };
  }
  return result;
}

/**
 * Relink a new phone: first + last + contact must ALL match exactly one
 * attendee. Failures stay generic so names can't be enumerated.
 */
export async function findAndCheckin(input: {
  firstName: string;
  lastName: string;
  contact: string;
}): Promise<CheckinOutcome> {
  const first = (input.firstName ?? "").trim().toLowerCase();
  const last = (input.lastName ?? "").trim().toLowerCase();
  const contact = (input.contact ?? "").trim();
  if (!first || !last || !contact) {
    return { ok: false, code: "not_found", error: "Fill in your name and the phone or email you gave us." };
  }

  const hdrs = await headers();
  const ip = (hdrs.get("x-forwarded-for") ?? "unknown").split(",")[0].trim();
  if (!allowAttempt(`findme:${ip}`, 10, 10 * 60 * 1000)) {
    return { ok: false, error: "Too many tries — wait a few minutes and try again." };
  }

  const window = await currentWindow();
  if (!window) return CLOSED;

  const digits = contact.replace(/\D/g, "");
  const emailLow = contact.toLowerCase();

  const { data, error } = await supabaseAdmin().from("attendees").select("*");
  if (error) {
    console.error("[checkin] find-me lookup failed", error);
    return GENERIC_FAIL;
  }
  const hits = ((data ?? []) as AttendeeRow[]).filter(
    (a) =>
      a.first_name.trim().toLowerCase() === first &&
      a.last_name.trim().toLowerCase() === last &&
      ((digits.length >= 7 && (a.phone ?? "") === digits) ||
        (contact.includes("@") && (a.email ?? "") === emailLow)),
  );
  if (hits.length !== 1) {
    return {
      ok: false,
      code: "not_found",
      error: "We couldn't confirm a match. You can check in as new and our team will connect your records.",
    };
  }

  const attendee = hits[0];
  const token = await newDeviceToken(attendee.id);
  const result = await performCheckin(attendee, window);
  if (result.ok && token) {
    return { ...result, attendeeId: attendee.id, token };
  }
  return result;
}
