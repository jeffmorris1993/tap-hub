import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, siteUrl, type Field } from "./template";

const DEFAULT_FROM = "NT Gateway Announcements <events@nehtemple.org>";

export type PollResultsSnapshot = {
  id: string;
  category: string;
  title: string;
  closedAtIso: string | null;
};

// Structural copy of lib/polls' tally shape — typed here rather than imported
// so lib/polls can import this module without a cycle.
export type PollResultsTally = {
  options: { id: string; label: string; count: number }[];
  total: number;
};

async function send(opts: { from: string; to: string | string[]; subject: string; html: string; text: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[poll-results] RESEND_API_KEY not set — skipping send.");
    return;
  }
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send(opts);
    if (error) console.error("[poll-results] resend error", error, "to:", opts.to);
  } catch (err) {
    console.error("[poll-results] send failed", err);
  }
}

function pct(count: number, total: number): string {
  return total === 0 ? "0%" : `${Math.round((count / total) * 100)}%`;
}

/** Results email to the poll creator + watchers, sent once when the voting
 *  window closes (daily cron, or lazily by the first viewer after close). */
export async function sendPollResults(
  poll: PollResultsSnapshot,
  tally: PollResultsTally,
  recipients: string[],
): Promise<void> {
  if (recipients.length === 0) return;
  const from = process.env.EVENT_APPROVAL_FROM || DEFAULT_FROM;
  const publicHref = `${siteUrl()}/announcements/${poll.id}`;

  const ranked = [...tally.options].sort((a, b) => b.count - a.count);
  const tie = tally.total > 0 && ranked.length > 1 && ranked[0].count === ranked[1].count;
  const winner = tally.total > 0 && !tie ? ranked[0] : null;

  const noticeText =
    tally.total === 0
      ? "No votes were cast. Consider reposting the poll with a longer window or more promotion."
      : tie
        ? `It's a tie at the top with ${ranked[0].count} votes each.`
        : `Winner: ${winner!.label} — ${winner!.count} of ${tally.total} votes (${pct(winner!.count, tally.total)}).`;

  const fields: Field[] = ranked.map((o, i) => ({
    label: `#${i + 1}`,
    value: `${o.label} — ${o.count} ${o.count === 1 ? "vote" : "votes"} (${pct(o.count, tally.total)})`,
  }));
  fields.push({ label: "Total votes", value: String(tally.total) });

  const html = renderBrandedEmail({
    eyebrow: "Nehemiah's Temple · Poll Results",
    headline: `Poll closed — ${poll.title}`,
    intro: "The voting window has ended. Here's how the congregation voted.",
    notice: { variant: "highlight", text: noticeText },
    fields,
    cta: { label: "View the announcement", href: publicHref },
    footnote: "You're receiving this because you created this poll or were added as a results watcher.",
  });

  const text = [
    `Poll closed — ${poll.title}`,
    "",
    noticeText,
    "",
    ...ranked.map((o, i) => `${i + 1}. ${o.label} — ${o.count} (${pct(o.count, tally.total)})`),
    `Total votes: ${tally.total}`,
    "",
    `View the announcement: ${publicHref}`,
  ].join("\n");

  await send({
    from,
    to: recipients,
    subject: `Poll results — ${poll.title}`,
    html,
    text,
  });
}
