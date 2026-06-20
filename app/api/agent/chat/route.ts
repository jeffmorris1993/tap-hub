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
 *   https://tap-hub.nehtemple.org/api/agent/chat?key=<your secret>
 *
 * For now we authenticate via a shared secret in the `key` query param
 * (GOOGLE_CHAT_VERIFICATION_TOKEN). Sender authorization happens via the
 * @nehtemple.org allowlist on the user's workspace email.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);

  // ---- Diagnostic logging ----------------------------------------------
  const receivedKey = url.searchParams.get("key") ?? "";
  const requiredKey = process.env.GOOGLE_CHAT_VERIFICATION_TOKEN ?? "";
  const hasAuth = request.headers.has("authorization");
  const ua = request.headers.get("user-agent") ?? "(none)";
  const contentType = request.headers.get("content-type") ?? "(none)";

  const rawBody = await request.text();
  console.log("[agent/chat] request", {
    url: request.url,
    pathname: url.pathname,
    searchKeys: [...url.searchParams.keys()],
    keyLen: receivedKey.length,
    keyPrefix: receivedKey.slice(0, 6),
    keySuffix: receivedKey.slice(-6),
    expectedKeyLen: requiredKey.length,
    expectedKeySet: requiredKey.length > 0,
    keyMatches: receivedKey === requiredKey,
    hasAuthHeader: hasAuth,
    contentType,
    userAgent: ua,
    bodyLen: rawBody.length,
    bodyHead: rawBody.slice(0, 200),
  });

  // ---- Key check (now also logs blocked attempts to agent_runs) --------
  if (requiredKey && receivedKey !== requiredKey) {
    await logRow({
      channel: "chat",
      sender: "(unauthorized webhook)",
      input: `key check failed (len ${receivedKey.length}, prefix ${receivedKey.slice(0, 8)}…, suffix …${receivedKey.slice(-8)}; expected len ${requiredKey.length})`,
      output: "401 Unauthorized — key mismatch",
      status: "blocked",
    });
    return NextResponse.json({ text: "Unauthorized." }, { status: 401 });
  }

  // ---- Parse body ------------------------------------------------------
  let event: unknown;
  try {
    event = rawBody ? JSON.parse(rawBody) : {};
  } catch (err) {
    console.error("[agent/chat] body parse error", err);
    await logRow({
      channel: "chat",
      sender: "(parse error)",
      input: rawBody.slice(0, 500),
      output: `400 Bad JSON — ${err instanceof Error ? err.message : String(err)}`,
      status: "error",
    });
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

  console.log("[agent/chat] parsed", {
    type: ev.type,
    senderEmail: ev.message?.sender?.email ?? ev.user?.email,
    senderName: ev.message?.sender?.displayName ?? ev.user?.displayName,
    spaceName: ev.space?.name,
    textPreview: (ev.message?.argumentText || ev.message?.text || "").slice(0, 120),
  });

  // ---- Standard event handling ----------------------------------------
  if (ev.type === "ADDED_TO_SPACE") {
    await logRow({
      channel: "chat",
      sender: ev.user?.email ?? "(unknown)",
      input: "(ADDED_TO_SPACE event)",
      output: "Sent intro message.",
      status: "ok",
    });
    return NextResponse.json({
      text:
        "👋 TapHub assistant connected. Talk to me in plain English — schedule services, " +
        "add events, post the youth lesson, or ask 'how many new visitors today'.",
    });
  }
  if (ev.type !== "MESSAGE") {
    await logRow({
      channel: "chat",
      sender: ev.user?.email ?? "(unknown)",
      input: `(${ev.type ?? "unknown"} event)`,
      output: "ignored (non-MESSAGE event)",
      status: "ok",
    });
    return NextResponse.json({});
  }

  const senderEmail = ev.message?.sender?.email ?? ev.user?.email ?? null;
  const senderName = ev.message?.sender?.displayName ?? ev.user?.displayName ?? senderEmail ?? "(unknown)";
  const rawText = (ev.message?.argumentText || ev.message?.text || "").trim();

  if (!senderEmail || !isAllowedAgentSender(senderEmail)) {
    await logRow({
      channel: "chat",
      sender: senderName,
      input: rawText,
      output: `Sender not on allowlist (sender: ${senderEmail ?? "no-email"})`,
      status: "blocked",
    });
    return NextResponse.json({
      text: `Sorry, ${senderName} — agent access is restricted to @nehtemple.org accounts.`,
    });
  }

  if (!rawText) {
    return NextResponse.json({ text: "What can I help with?" });
  }

  const threadKey = ev.space?.name || `direct:${senderEmail}`;
  const result = await runAgent({
    channel: "chat",
    sender: senderEmail,
    text: rawText,
    threadKey,
  });
  return NextResponse.json({ text: result.text });
}

/**
 * Allow GET so you can pop the URL in a browser to confirm DNS / SSL /
 * routing without needing to fake a POST. Returns a tiny JSON status.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const receivedKey = url.searchParams.get("key") ?? "";
  const requiredKey = process.env.GOOGLE_CHAT_VERIFICATION_TOKEN ?? "";
  return NextResponse.json({
    ok: true,
    route: "/api/agent/chat",
    method: "GET (diagnostic)",
    expects: "POST with body from Google Chat",
    keyProvided: receivedKey.length > 0,
    keyLen: receivedKey.length,
    keyMatches: requiredKey ? receivedKey === requiredKey : null,
    expectedKeyLen: requiredKey.length,
    timestamp: new Date().toISOString(),
  });
}

async function logRow(p: {
  channel: "chat";
  sender: string;
  input: string;
  output: string;
  status: "ok" | "blocked" | "error";
}) {
  try {
    await supabaseAdmin().from("agent_runs").insert({
      channel: p.channel,
      sender: p.sender,
      input: p.input.slice(0, 4000),
      tool_calls: [],
      output: p.output.slice(0, 4000),
      status: p.status,
    });
  } catch (err) {
    console.error("[agent/chat] failed to log row", err);
  }
}
