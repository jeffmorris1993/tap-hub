import { NextResponse, type NextRequest } from "next/server";
import { runAgent, isAllowedAgentSender } from "../../../../lib/agent";
import { supabaseAdmin } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Google Chat app webhook.
 *
 * Configure the Chat app in Google Cloud Console (Chat API → Configuration)
 * with HTTP endpoint URL:
 *   https://tap-hub-theta.vercel.app/api/agent/chat?key=<your secret>
 *
 * For now we authenticate via a shared secret in the `key` query param
 * (GOOGLE_CHAT_VERIFICATION_TOKEN). Sender authorization happens via the
 * @nehtemple.org allowlist on the user's workspace email.
 *
 * Google Chat event shape:
 *   { type: "MESSAGE", message: { text, sender: { email, displayName } }, ... }
 *
 * Response shape: { text: "…" } renders as a plain text message in the chat.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const requiredKey = process.env.GOOGLE_CHAT_VERIFICATION_TOKEN;
  if (requiredKey && url.searchParams.get("key") !== requiredKey) {
    return NextResponse.json({ text: "Unauthorized." }, { status: 401 });
  }

  let event: unknown;
  try {
    event = await request.json();
  } catch {
    return NextResponse.json({ text: "Invalid JSON." }, { status: 400 });
  }

  const ev = event as {
    type?: string;
    message?: {
      text?: string;
      sender?: { email?: string; displayName?: string };
      argumentText?: string;
    };
    space?: { name?: string };
    user?: { email?: string; displayName?: string };
  };

  // Google Chat sends ADDED_TO_SPACE / REMOVED_FROM_SPACE / MESSAGE events.
  if (ev.type === "ADDED_TO_SPACE") {
    return NextResponse.json({
      text:
        "👋 TapHub assistant connected. Talk to me in plain English — schedule services, " +
        "add events, post the youth lesson, or ask 'how many new visitors today'.",
    });
  }
  if (ev.type !== "MESSAGE") {
    return NextResponse.json({});
  }

  const senderEmail = ev.message?.sender?.email ?? ev.user?.email ?? null;
  const senderName = ev.message?.sender?.displayName ?? ev.user?.displayName ?? senderEmail ?? "(unknown)";
  const rawText = (ev.message?.argumentText || ev.message?.text || "").trim();

  if (!senderEmail || !isAllowedAgentSender(senderEmail)) {
    await logBlocked("chat", senderName, rawText);
    return NextResponse.json({
      text: `Sorry, ${senderName} — agent access is restricted to @nehtemple.org accounts.`,
    });
  }

  if (!rawText) {
    return NextResponse.json({ text: "What can I help with?" });
  }

  // Persist conversation by Google Chat space — one DM per user, so the space
  // ID gives us a stable per-person thread.
  const threadKey = ev.space?.name || `direct:${senderEmail}`;
  const result = await runAgent({
    channel: "chat",
    sender: senderEmail,
    text: rawText,
    threadKey,
  });
  return NextResponse.json({ text: result.text });
}

async function logBlocked(channel: "chat" | "sms" | "email", sender: string, text: string) {
  try {
    await supabaseAdmin().from("agent_runs").insert({
      channel,
      sender,
      input: text,
      tool_calls: [],
      output: "Sender not on allowlist.",
      status: "blocked",
    });
  } catch (err) {
    console.error("[agent/chat] failed to log blocked sender", err);
  }
}
