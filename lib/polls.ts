import "server-only";
import { createHash } from "crypto";
import { supabaseAdmin } from "./supabase/server";
import { normalizeEmails } from "./event-notify";
import { sendPollResults } from "./email/poll-results";

/**
 * Anonymous poll voting.
 *
 * One vote per device: the first vote sets a random httpOnly cookie token and
 * we store sha256(token) as poll_votes.voter_key — the unique
 * (announcement_id, voter_key) constraint is the dedup, enforced at insert
 * time so there's no read-before-write race. IPs are hashed and used ONLY to
 * rate-limit bursts, never to dedup — the whole church shares one Wi-Fi IP.
 */

export const POLL_VOTER_COOKIE = "nt_poll_voter";
/** A device's voter cookie lives a year — long enough to cover any poll. */
export const POLL_VOTER_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** Burst guard per (poll, IP): more votes than this inside the window is a
 *  script, not a Sunday crowd on shared Wi-Fi arriving over hours. */
export const POLL_IP_RATE_LIMIT = 15;
export const POLL_IP_RATE_WINDOW_MS = 10 * 60 * 1000;

export function hashVoterToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export function hashVoterIp(ip: string): string {
  return createHash("sha256")
    .update(`${ip}|${process.env.POLL_IP_SALT ?? "nt-poll"}`)
    .digest("hex");
}

export type PollRow = {
  id: string;
  kind: string;
  published: boolean;
  approval_status: string;
  poll_closes_at: string | null;
};

export function pollIsOpen(row: PollRow): boolean {
  return (
    row.kind === "poll" &&
    row.published &&
    row.approval_status === "approved" &&
    !!row.poll_closes_at &&
    Date.parse(row.poll_closes_at) > Date.now()
  );
}

export function pollIsClosed(row: PollRow): boolean {
  return (
    row.kind === "poll" &&
    !!row.poll_closes_at &&
    Date.parse(row.poll_closes_at) <= Date.now()
  );
}

export type PollTallyOption = { id: string; label: string; count: number };
export type PollTally = { options: PollTallyOption[]; total: number };

/** Counts per option, options in form order. Vote volume is church-sized, so
 *  one select + a JS group-by beats a DB aggregate round-trip. */
export async function tallyPoll(announcementId: string): Promise<PollTally> {
  const sb = supabaseAdmin();
  const [optRes, voteRes] = await Promise.all([
    sb
      .from("poll_options")
      .select("id, label, position")
      .eq("announcement_id", announcementId)
      .order("position", { ascending: true }),
    sb.from("poll_votes").select("option_id").eq("announcement_id", announcementId),
  ]);
  if (optRes.error) throw optRes.error;
  if (voteRes.error) throw voteRes.error;

  const counts = new Map<string, number>();
  for (const v of (voteRes.data ?? []) as { option_id: string }[]) {
    counts.set(v.option_id, (counts.get(v.option_id) ?? 0) + 1);
  }
  const options = ((optRes.data ?? []) as { id: string; label: string }[]).map((o) => ({
    id: o.id,
    label: o.label,
    count: counts.get(o.id) ?? 0,
  }));
  return { options, total: options.reduce((n, o) => n + o.count, 0) };
}

/** "Family Feud" for a clear winner, null for zero votes or a tie. */
export function tallyWinner(tally: PollTally): PollTallyOption | null {
  if (tally.total === 0) return null;
  const sorted = [...tally.options].sort((a, b) => b.count - a.count);
  if (sorted.length > 1 && sorted[0].count === sorted[1].count) return null;
  return sorted[0];
}

/**
 * Send the results email for a closed, approved, not-yet-notified poll.
 * Claim-first: the conditional update stamps poll_results_sent_at and only
 * the caller whose update actually matched a row proceeds to send, so the
 * daily cron and the lazy first-viewer trigger can race safely.
 */
export async function maybeSendPollResults(announcementId: string): Promise<boolean> {
  const nowIso = new Date().toISOString();
  const { data, error } = await supabaseAdmin()
    .from("announcements")
    .update({ poll_results_sent_at: nowIso })
    .eq("id", announcementId)
    .eq("kind", "poll")
    .eq("approval_status", "approved")
    .is("poll_results_sent_at", null)
    .lte("poll_closes_at", nowIso)
    .select("id, category, title, date_label, poll_closes_at, poll_notify_emails, submitted_by");
  if (error) {
    console.error("[polls] results claim failed", announcementId, error);
    return false;
  }
  const row = data?.[0] as
    | {
        id: string;
        category: string;
        title: string;
        date_label: string | null;
        poll_closes_at: string | null;
        poll_notify_emails: string[] | null;
        submitted_by: string | null;
      }
    | undefined;
  if (!row) return false;

  const recipients = normalizeEmails([row.submitted_by, ...(row.poll_notify_emails ?? [])]);
  if (recipients.length === 0) {
    console.warn("[polls] poll closed with no notifiable recipients", announcementId);
    return true;
  }
  const tally = await tallyPoll(announcementId);
  await sendPollResults(
    { id: row.id, category: row.category, title: row.title, closedAtIso: row.poll_closes_at },
    tally,
    recipients,
  );
  return true;
}
