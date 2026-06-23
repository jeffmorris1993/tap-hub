import { NextResponse, type NextRequest } from "next/server";
import { runAgent } from "../../../../lib/agent";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { verifyTwilioSignature, sendTwilioSms } from "../../../../lib/twilio";
import { emailForPhone } from "../../../../lib/admin-phones";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Inbound SMS webhook for the LLM admin agent.
 *
 * Configure in Twilio Console:
 *   Phone Numbers → My Numbers → {your number} → Messaging Configuration
 *   "A MESSAGE COMES IN": HTTP POST, URL:
 *     https://tap-hub.nehtemple.org/api/agent/sms
 *
 * Auth: Twilio signs each request with HMAC-SHA1 against TWILIO_AUTH_TOKEN.
 * Senders are gated by ADMIN_PHONE_MAP (phone → email). Conversation
 * memory is threaded per phone number via agent_threads.
 *
 * We respond to Twilio with an empty TwiML envelope (so Twilio doesn't
 * auto-send anything) and POST the real reply back through the Twilio
 * REST API. This keeps the webhook fast and avoids the 15-second
 * inbound-timeout dance.
 */
export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  const params = Object.fromEntries(new URLSearchParams(rawBody).entries()) as Record<string, string>;

  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const signature = request.headers.get("x-twilio-signature") ?? "";
  // Twilio signs against the URL exactly as configured. Use the public
  // domain via NEXT_PUBLIC_SITE_URL so it matches even though the request
  // came in through Vercel's preview/internal hosts.
  const publicBase = (process.env.NEXT_PUBLIC_SITE_URL || "https://tap-hub.nehtemple.org").replace(/\/$/, "");
  const expectedUrl = `${publicBase}/api/agent/sms`;

  if (!authToken) {
    console.error("[agent/sms] TWILIO_AUTH_TOKEN not set — rejecting");
    return new NextResponse(emptyTwiml(), { status: 401, headers: { "Content-Type": "text/xml" } });
  }

  const sigOk = verifyTwilioSignature({ authToken, url: expectedUrl, params, signature });
  if (!sigOk) {
    console.error("[agent/sms] bad Twilio signature", {
      from: params.From,
      expectedUrl,
      hasSignature: !!signature,
    });
    return new NextResponse(emptyTwiml(), { status: 403, headers: { "Content-Type": "text/xml" } });
  }

  const fromPhone = params.From ?? "";
  const text = (params.Body ?? "").trim();

  console.log("[agent/sms] request", {
    from: fromPhone,
    bodyLen: text.length,
    textPreview: text.slice(0, 120),
  });

  if (!text) {
    // Empty body / non-text MMS — acknowledge silently.
    return twiml("");
  }

  const senderEmail = emailForPhone(fromPhone);
  if (!senderEmail) {
    await logBlocked(fromPhone, text);
    // Reply with a polite rejection so staff aren't confused about why no
    // response came.
    await sendTwilioSms({
      to: fromPhone,
      body: "This TapHub agent only accepts texts from staff phones on the allowlist. Contact websitemediaadmin@nehtemple.org to be added.",
    });
    return twiml("");
  }

  const result = await runAgent({
    channel: "sms",
    sender: senderEmail,
    text,
    threadKey: fromPhone,
  });

  await sendTwilioSms({ to: fromPhone, body: result.text });
  return twiml("");
}

function emptyTwiml(): string {
  return '<?xml version="1.0" encoding="UTF-8"?><Response/>';
}

function twiml(_body: string): NextResponse {
  // We always reply via the REST API (so we control formatting + timing),
  // so the TwiML is empty. Keeping the helper around in case we want to
  // switch to inline TwiML replies later.
  return new NextResponse(emptyTwiml(), {
    status: 200,
    headers: { "Content-Type": "text/xml" },
  });
}

async function logBlocked(senderPhone: string, text: string) {
  try {
    await supabaseAdmin().from("agent_runs").insert({
      channel: "sms",
      sender: senderPhone,
      input: text.slice(0, 2000),
      tool_calls: [],
      output: "Sender phone not in ADMIN_PHONE_MAP.",
      status: "blocked",
    });
  } catch (err) {
    console.error("[agent/sms] failed to log blocked sender", err);
  }
}
