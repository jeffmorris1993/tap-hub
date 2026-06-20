import { NextResponse, type NextRequest } from "next/server";
import { runAgent, isAllowedAgentSender } from "../../../../lib/agent";
import { supabaseAdmin } from "../../../../lib/supabase/server";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Google Chat app webhook.
 *
 * Supports two payload formats:
 * - Legacy "Chat-specific" format:    { type, message, space, user }
 * - New Google Workspace Add-ons:     { commonEventObject,
 *                                       authorizationEventObject,
 *                                       chat: { eventType,
 *                                               messagePayload: {
 *                                                 message, space, ... } } }
 *
 * The user-agent `Google-gsuiteaddons` tells us which format we got.
 * We auto-detect and respond in the matching shape.
 */
export async function POST(request: NextRequest) {
  const url = new URL(request.url);

  const receivedKey = url.searchParams.get("key") ?? "";
  const requiredKey = process.env.GOOGLE_CHAT_VERIFICATION_TOKEN ?? "";

  const rawBody = await request.text();
  console.log("[agent/chat] request", {
    url: request.url,
    keyMatches: receivedKey === requiredKey,
    hasAuthHeader: request.headers.has("authorization"),
    contentType: request.headers.get("content-type") ?? "(none)",
    userAgent: request.headers.get("user-agent") ?? "(none)",
    bodyLen: rawBody.length,
    bodyHead: rawBody.slice(0, 800),
  });

  if (requiredKey && receivedKey !== requiredKey) {
    await logRow({
      sender: "(unauthorized webhook)",
      input: `key check failed (len ${receivedKey.length}, prefix ${receivedKey.slice(0, 8)}…, suffix …${receivedKey.slice(-8)}; expected len ${requiredKey.length})`,
      output: "401 Unauthorized — key mismatch",
      status: "blocked",
    });
    return NextResponse.json({ text: "Unauthorized." }, { status: 401 });
  }

  let event: AnyJson;
  try {
    event = rawBody ? (JSON.parse(rawBody) as AnyJson) : {};
  } catch (err) {
    await logRow({
      sender: "(parse error)",
      input: rawBody.slice(0, 500),
      output: `400 Bad JSON — ${err instanceof Error ? err.message : String(err)}`,
      status: "error",
    });
    return NextResponse.json({ text: "Invalid JSON." }, { status: 400 });
  }

  const parsed = parseChatEvent(event);
  console.log("[agent/chat] parsed", {
    format: parsed.format,
    eventType: parsed.eventType,
    senderEmail: parsed.senderEmail,
    senderName: parsed.senderName,
    spaceName: parsed.spaceName,
    textPreview: parsed.text.slice(0, 120),
  });

  const wantsAddonsResponse = parsed.format === "addons";

  if (parsed.eventType === "ADDED_TO_SPACE") {
    const text =
      "👋 TapHub assistant connected. Talk to me in plain English — schedule services, " +
      "add events, post the youth lesson, or ask 'how many new visitors today'.";
    await logRow({
      sender: parsed.senderEmail ?? "(unknown)",
      input: "(ADDED_TO_SPACE event)",
      output: "Sent intro message.",
      status: "ok",
    });
    return NextResponse.json(buildResponse(text, wantsAddonsResponse));
  }

  if (parsed.eventType !== "MESSAGE") {
    await logRow({
      sender: parsed.senderEmail ?? "(unknown)",
      input: `(${parsed.eventType ?? "unknown"} event, format=${parsed.format})`,
      output: "ignored (non-MESSAGE event)",
      status: "ok",
    });
    return NextResponse.json(buildResponse("", wantsAddonsResponse));
  }

  if (!parsed.senderEmail || !isAllowedAgentSender(parsed.senderEmail)) {
    await logRow({
      sender: parsed.senderName,
      input: parsed.text,
      output: `Sender not on allowlist (sender: ${parsed.senderEmail ?? "no-email"})`,
      status: "blocked",
    });
    return NextResponse.json(
      buildResponse(
        `Sorry, ${parsed.senderName} — agent access is restricted to @nehtemple.org accounts.`,
        wantsAddonsResponse,
      ),
    );
  }

  if (!parsed.text) {
    return NextResponse.json(buildResponse("What can I help with?", wantsAddonsResponse));
  }

  const threadKey = parsed.spaceName || `direct:${parsed.senderEmail}`;
  const result = await runAgent({
    channel: "chat",
    sender: parsed.senderEmail,
    text: parsed.text,
    threadKey,
  });
  return NextResponse.json(buildResponse(result.text, wantsAddonsResponse));
}

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

// ----------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------

type AnyJson = Record<string, unknown> | unknown[] | string | number | boolean | null;

type Parsed = {
  format: "legacy" | "addons";
  eventType: string | null;
  senderEmail: string | null;
  senderName: string;
  spaceName: string | null;
  text: string;
};

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function get<T = unknown>(obj: unknown, path: string): T | null {
  let cur: unknown = obj;
  for (const seg of path.split(".")) {
    if (!isObject(cur)) return null;
    cur = cur[seg];
  }
  return (cur ?? null) as T | null;
}

function parseChatEvent(event: unknown): Parsed {
  // Detect format: the new Google Workspace Add-ons payload always has
  // a `commonEventObject` at the root.
  const isAddons = isObject(event) && "commonEventObject" in event;
  const format: "legacy" | "addons" = isAddons ? "addons" : "legacy";

  if (isAddons) {
    const eventType =
      get<string>(event, "chat.eventType") ||
      get<string>(event, "chat.type") ||
      // Older variants placed the type at the root or under chat.messagePayload
      get<string>(event, "type") ||
      null;
    const message =
      (get(event, "chat.messagePayload.message") as Record<string, unknown> | null) ||
      (get(event, "chat.message") as Record<string, unknown> | null) ||
      null;
    const messageSender = message && isObject(message.sender) ? (message.sender as Record<string, unknown>) : null;
    const chatUser = (get(event, "chat.user") as Record<string, unknown> | null) || null;
    const space =
      get<string>(event, "chat.messagePayload.space.name") ||
      get<string>(event, "chat.messagePayload.message.space.name") ||
      get<string>(event, "chat.space.name") ||
      null;

    const senderEmail =
      (messageSender?.email as string | undefined) ||
      (chatUser?.email as string | undefined) ||
      null;
    const senderName =
      (messageSender?.displayName as string | undefined) ||
      (chatUser?.displayName as string | undefined) ||
      senderEmail ||
      "(unknown)";
    const text =
      ((message?.argumentText as string | undefined) ||
        (message?.text as string | undefined) ||
        "").trim();

    return { format, eventType, senderEmail, senderName, spaceName: space, text };
  }

  // Legacy format
  const eventType = get<string>(event, "type");
  const message = get(event, "message") as Record<string, unknown> | null;
  const messageSender = message && isObject(message.sender) ? (message.sender as Record<string, unknown>) : null;
  const user = get(event, "user") as Record<string, unknown> | null;
  const senderEmail =
    (messageSender?.email as string | undefined) || (user?.email as string | undefined) || null;
  const senderName =
    (messageSender?.displayName as string | undefined) ||
    (user?.displayName as string | undefined) ||
    senderEmail ||
    "(unknown)";
  const text =
    ((message?.argumentText as string | undefined) ||
      (message?.text as string | undefined) ||
      "").trim();
  const spaceName = get<string>(event, "space.name");
  return { format, eventType, senderEmail, senderName, spaceName, text };
}

/**
 * Builds the response in the format Google expects for the given inbound
 * shape. The new Add-ons format wants a wrapped `hostAppDataAction` →
 * `chatDataAction` → `createMessageAction` envelope. The legacy format
 * just wants `{ text }`.
 */
function buildResponse(text: string, useAddonsFormat: boolean): Record<string, unknown> {
  if (!useAddonsFormat) {
    return text ? { text } : {};
  }
  if (!text) return {};
  return {
    hostAppDataAction: {
      chatDataAction: {
        createMessageAction: {
          message: { text },
        },
      },
    },
  };
}

async function logRow(p: {
  sender: string;
  input: string;
  output: string;
  status: "ok" | "blocked" | "error";
}) {
  try {
    await supabaseAdmin().from("agent_runs").insert({
      channel: "chat",
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
