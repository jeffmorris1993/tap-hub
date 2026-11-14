"use server";

import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";
import { supabaseAdmin } from "../../../lib/supabase/server";
import {
  POLL_IP_RATE_LIMIT,
  POLL_IP_RATE_WINDOW_MS,
  POLL_VOTER_COOKIE,
  POLL_VOTER_COOKIE_MAX_AGE,
  hashVoterIp,
  hashVoterToken,
  maybeSendPollResults,
  pollIsOpen,
  tallyPoll,
} from "../../../lib/polls";

/**
 * Anonymous public voting. These actions are called from the PollCard client
 * island so the announcement detail page itself stays ISR — cookies are only
 * ever touched inside the action POSTs, which are never cached.
 */

export type PollState = {
  ok: true;
  open: boolean;
  closed: boolean;
  closesAt: string | null;
  /** Null until the viewer has voted (or the poll closed) — results are
   *  revealed only after you cast your vote. */
  options: { id: string; label: string; count: number | null }[];
  total: number | null;
  votedOptionId: string | null;
};

export type PollStateResult = PollState | { ok: false; error: string };

type AnnRow = {
  id: string;
  kind: string;
  published: boolean;
  approval_status: string;
  poll_closes_at: string | null;
  poll_results_sent_at: string | null;
};

async function loadPoll(announcementId: string): Promise<AnnRow | null> {
  const { data, error } = await supabaseAdmin()
    .from("announcements")
    .select("id, kind, published, approval_status, poll_closes_at, poll_results_sent_at")
    .eq("id", announcementId)
    .limit(1);
  if (error || !data?.[0]) return null;
  const row = data[0] as AnnRow;
  return row.kind === "poll" && row.approval_status === "approved" && row.published ? row : null;
}

async function currentVote(announcementId: string): Promise<string | null> {
  const token = (await cookies()).get(POLL_VOTER_COOKIE)?.value;
  if (!token) return null;
  const { data } = await supabaseAdmin()
    .from("poll_votes")
    .select("option_id")
    .eq("announcement_id", announcementId)
    .eq("voter_key", hashVoterToken(token))
    .limit(1);
  return (data?.[0] as { option_id: string } | undefined)?.option_id ?? null;
}

async function buildState(announcementId: string, row: AnnRow): Promise<PollState> {
  const open = pollIsOpen(row);
  const closed = !!row.poll_closes_at && Date.parse(row.poll_closes_at) <= Date.now();
  const votedOptionId = await currentVote(announcementId);
  const tally = await tallyPoll(announcementId);
  const reveal = closed || votedOptionId !== null;
  return {
    ok: true,
    open,
    closed,
    closesAt: row.poll_closes_at,
    options: tally.options.map((o) => ({ id: o.id, label: o.label, count: reveal ? o.count : null })),
    total: reveal ? tally.total : null,
    votedOptionId,
  };
}

export async function getPollState(announcementId: string): Promise<PollStateResult> {
  const row = await loadPoll(announcementId);
  if (!row) return { ok: false, error: "This poll isn't available." };

  // Lazy results trigger: the daily cron can lag a closed poll by hours, so
  // the first view after close fires the (race-safe, send-once) email too.
  if (row.poll_closes_at && Date.parse(row.poll_closes_at) <= Date.now() && !row.poll_results_sent_at) {
    await maybeSendPollResults(announcementId);
  }

  return buildState(announcementId, row);
}

export async function votePoll(announcementId: string, optionId: string): Promise<PollStateResult> {
  const row = await loadPoll(announcementId);
  if (!row) return { ok: false, error: "This poll isn't available." };
  if (!pollIsOpen(row)) {
    return { ok: false, error: "Voting has closed for this poll." };
  }

  // The option must belong to this poll — a cross-poll optionId is garbage.
  const { data: optRows } = await supabaseAdmin()
    .from("poll_options")
    .select("id")
    .eq("id", optionId)
    .eq("announcement_id", announcementId)
    .limit(1);
  if (!optRows?.[0]) return { ok: false, error: "That option isn't part of this poll." };

  const cookieStore = await cookies();
  let token = cookieStore.get(POLL_VOTER_COOKIE)?.value;
  if (!token) {
    token = randomUUID();
    cookieStore.set(POLL_VOTER_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: POLL_VOTER_COOKIE_MAX_AGE,
      path: "/",
    });
  }

  // Burst rate limit per (poll, IP). Soft signal only — never a dedup, the
  // church building shares one Wi-Fi IP across hundreds of members.
  const forwarded = (await headers()).get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() || null;
  const ipHash = ip ? hashVoterIp(ip) : null;
  if (ipHash) {
    const windowStart = new Date(Date.now() - POLL_IP_RATE_WINDOW_MS).toISOString();
    const { count } = await supabaseAdmin()
      .from("poll_votes")
      .select("id", { count: "exact", head: true })
      .eq("announcement_id", announcementId)
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart);
    if ((count ?? 0) >= POLL_IP_RATE_LIMIT) {
      return { ok: false, error: "Too many votes from this network right now — try again in a few minutes." };
    }
  }

  const { error } = await supabaseAdmin().from("poll_votes").insert({
    announcement_id: announcementId,
    option_id: optionId,
    voter_key: hashVoterToken(token),
    ip_hash: ipHash,
  });
  // 23505 = unique violation on (announcement_id, voter_key): this device
  // already voted. Not an error — just show them the results.
  if (error && (error as { code?: string }).code !== "23505") {
    console.error("[polls] vote insert failed", error);
    return { ok: false, error: "Couldn't record your vote — please try again." };
  }

  return buildState(announcementId, row);
}
