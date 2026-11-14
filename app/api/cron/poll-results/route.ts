import { NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { maybeSendPollResults } from "../../../../lib/polls";

export const dynamic = "force-dynamic";

/**
 * Daily Vercel Cron (vercel.json, 12:00 UTC — Hobby plans only allow daily
 * crons): emails poll results to the creator + watchers for every approved
 * poll whose voting window has closed and whose results haven't been sent.
 * maybeSendPollResults claims via a conditional update, so this is idempotent
 * and race-safe against the lazy first-viewer trigger in getPollState.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin()
    .from("announcements")
    .select("id")
    .eq("kind", "poll")
    .eq("approval_status", "approved")
    .is("poll_results_sent_at", null)
    .lte("poll_closes_at", new Date().toISOString());
  if (error) {
    console.error("[cron:poll-results] query failed", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  let sent = 0;
  for (const row of (data ?? []) as { id: string }[]) {
    if (await maybeSendPollResults(row.id)) sent++;
  }
  return NextResponse.json({ checked: data?.length ?? 0, sent });
}
