import "server-only";

import { listApproverEmails } from "./approvers";

/**
 * Who hears about an event signup.
 *
 * The chain, most specific first:
 *   1. events.notify_emails  — an explicit list set on the event
 *   2. ministry leads for the event's category
 *   3. events.submitted_by   — whoever entered it (legacy behaviour)
 *   4. the pastoral list     — last resort, so no signup goes unseen
 *
 * Ministry leads are the default because the person who types an event in is
 * often media staff, not the person running it. "General" is deliberately not
 * a ministry — nobody leads it — so General events fall through to the
 * submitter.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type EventNotifyFields = {
  category: string | null;
  notify_emails: string[] | null;
  submitted_by: string | null;
};

/** Trim, lowercase, drop blanks and non-emails, de-duplicate. */
export function normalizeEmails(values: readonly (string | null | undefined)[]): string[] {
  const out = new Set<string>();
  for (const v of values) {
    const email = v?.trim().toLowerCase();
    if (email && EMAIL_RE.test(email)) out.add(email);
  }
  return [...out];
}

/**
 * Staff whose `ministries` include this category. Only the `lead` role is
 * considered — pastoral accounts carry no ministries and are reached through
 * the final fallback instead, so they don't get copied on every ministry's
 * signups.
 */
export async function listMinistryLeadEmails(category: string | null): Promise<string[]> {
  if (!category) return [];
  const { supabaseAdmin } = await import("./supabase/server");
  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("email")
    .eq("role", "lead")
    .contains("ministries", [category]);
  if (error) {
    // Never let a lookup failure swallow the notification — the caller's
    // remaining fallbacks still apply.
    console.error("[event-notify] ministry lead lookup failed", category, error);
    return [];
  }
  return normalizeEmails((data ?? []).map((r) => (r as { email: string | null }).email));
}

export async function resolveEventNotifyRecipients(event: EventNotifyFields): Promise<string[]> {
  const explicit = normalizeEmails(event.notify_emails ?? []);
  if (explicit.length > 0) return explicit;

  const leads = await listMinistryLeadEmails(event.category);
  if (leads.length > 0) return leads;

  const submitter = normalizeEmails([event.submitted_by]);
  if (submitter.length > 0) return submitter;

  return normalizeEmails(await listApproverEmails());
}

/**
 * Parses the portal form's free-text recipients box ("a@x.org, b@y.org", one
 * per line or comma-separated). Returns the cleaned list plus the entries that
 * weren't valid addresses, so saveEvent can refuse a typo instead of silently
 * dropping a recipient.
 */
export function parseNotifyEmails(raw: string | null | undefined): {
  emails: string[];
  invalid: string[];
} {
  const parts = (raw ?? "")
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const emails = normalizeEmails(parts);
  const invalid = parts.filter((p) => !EMAIL_RE.test(p.toLowerCase()));
  return { emails, invalid };
}
