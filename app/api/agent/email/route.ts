import { NextResponse, type NextRequest } from "next/server";
import { runAgent, isAllowedAgentSender } from "../../../../lib/agent";
import { sendAgentReply } from "../../../../lib/email/agent-reply";
import { supabaseAdmin } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Inbound email webhook for the LLM admin agent.
 *
 * Configure Resend Inbound (resend.com/inbound) with this URL:
 *   https://tap-hub.nehtemple.org/api/agent/email?key=<EMAIL_INBOUND_TOKEN>
 *
 * Staff send a normal email to whatever inbound address you set up
 * (e.g. agent@inbox.nehtemple.org). Resend POSTs the parsed email here,
 * we run the agent, and reply back via Resend outbound — threaded
 * (In-Reply-To + References) so the conversation stays as one thread
 * in Gmail / Outlook.
 *
 * Sender authorization: only @nehtemple.org. Memory: keyed by sender
 * email so each staff member has one rolling conversation.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const requiredKey = process.env.EMAIL_INBOUND_TOKEN;
  if (requiredKey && url.searchParams.get("key") !== requiredKey) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let event: unknown;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  // Resend wraps the payload as { type, data } for webhook events. We
  // accept the bare data shape too so this works with simple test
  // posts and other providers if you ever swap.
  const eventObj = event as { type?: string; data?: unknown } | undefined;
  const data = (eventObj?.data ?? event) as Record<string, unknown>;

  const fromHeader = pickString(data.from, data.From);
  const subject = pickString(data.subject, data.Subject) ?? "(no subject)";
  const text = pickString(data.text, data.body, data.Body) ?? "";
  const headers = (data.headers ?? {}) as Record<string, string>;
  const messageId =
    pickString(data.message_id, data.messageId, headers["message-id"], headers["Message-ID"]) ?? null;

  const senderEmail = extractEmail(fromHeader);
  const senderDisplay = fromHeader ?? senderEmail ?? "(unknown)";

  if (!senderEmail || !isAllowedAgentSender(senderEmail)) {
    await logBlocked(senderDisplay, text);
    // Don't reply — bounce silently so we don't fuel spam loops.
    return NextResponse.json({ ok: true, blocked: true });
  }

  const cleanText = stripQuotedReply(text).trim();
  if (!cleanText) {
    return NextResponse.json({ ok: true, empty: true });
  }

  const result = await runAgent({
    channel: "email",
    sender: senderEmail,
    text: cleanText,
    threadKey: senderEmail,
  });

  await sendAgentReply({
    to: senderEmail,
    subject,
    reply: result.text,
    toolCallsCount: result.toolCalls.length,
    inReplyTo: messageId?.replace(/^<|>$/g, "") ?? null,
  });

  return NextResponse.json({ ok: true });
}

function pickString(...candidates: unknown[]): string | null {
  for (const c of candidates) {
    if (typeof c === "string" && c.trim() !== "") return c;
  }
  return null;
}

function extractEmail(s: string | null): string | null {
  if (!s) return null;
  const angled = /<([^>]+)>/.exec(s);
  if (angled) return angled[1].trim().toLowerCase();
  const bare = /[^\s,;<>]+@[^\s,;<>]+/.exec(s);
  return bare ? bare[0].trim().toLowerCase() : null;
}

/**
 * Strip the quoted previous message off the end of a reply so the agent
 * only sees the new line(s) the staff member typed at the top. Gmail-
 * style `On X wrote:` and `>` prefixed lines both get cut.
 */
function stripQuotedReply(text: string): string {
  if (!text) return "";
  const onWrote = text.search(/^On .+wrote:$/m);
  let cut = text;
  if (onWrote > -1) cut = cut.slice(0, onWrote);
  // Also drop trailing block of "> "-prefixed lines and trailing whitespace.
  cut = cut.replace(/(\n>+ ?.*)+\s*$/g, "");
  return cut;
}

async function logBlocked(sender: string, text: string) {
  try {
    await supabaseAdmin().from("agent_runs").insert({
      channel: "email",
      sender,
      input: text.slice(0, 2000),
      tool_calls: [],
      output: "Sender not on allowlist.",
      status: "blocked",
    });
  } catch (err) {
    console.error("[agent/email] failed to log blocked sender", err);
  }
}
