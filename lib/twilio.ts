import "server-only";
import crypto from "node:crypto";

/**
 * Verify a Twilio webhook signature.
 *
 * Twilio signs every webhook with HMAC-SHA1 over (url + sorted form params)
 * using your Auth Token as the secret. Reject any request that doesn't
 * match — this is the only thing keeping randos from spoofing our SMS
 * endpoint.
 *
 * See: https://www.twilio.com/docs/usage/webhooks/webhooks-security
 */
export function verifyTwilioSignature(opts: {
  authToken: string;
  /** Full URL Twilio called, exactly as configured (including query string). */
  url: string;
  /** Parsed form fields from the request body. */
  params: Record<string, string>;
  /** Value of the X-Twilio-Signature header. */
  signature: string;
}): boolean {
  if (!opts.authToken || !opts.signature) return false;
  const sortedKeys = Object.keys(opts.params).sort();
  const data = opts.url + sortedKeys.map((k) => k + opts.params[k]).join("");
  const expected = crypto
    .createHmac("sha1", opts.authToken)
    .update(Buffer.from(data, "utf-8"))
    .digest("base64");
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "utf-8"),
      Buffer.from(opts.signature, "utf-8"),
    );
  } catch {
    return false;
  }
}

export type TwilioSendInput = {
  to: string;
  body: string;
};

/**
 * Send an SMS via the Twilio REST API. Returns true on success. Errors are
 * logged but never thrown — the agent's response already landed in
 * agent_runs, so a delivery failure shouldn't crash the webhook.
 */
export async function sendTwilioSms(input: TwilioSendInput): Promise<boolean> {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!sid || !token || !from) {
    console.warn("[twilio] missing TWILIO_ACCOUNT_SID / AUTH_TOKEN / PHONE_NUMBER — skipping send");
    return false;
  }
  const auth = Buffer.from(`${sid}:${token}`).toString("base64");
  const url = `https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`;
  // Twilio caps a single SMS at 1600 chars; long replies get split into
  // segments by the carrier. Trim very long outputs to keep cost sane.
  const body = input.body.length > 1500 ? `${input.body.slice(0, 1500)}…` : input.body;

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: input.to, From: from, Body: body }).toString(),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "(no body)");
      console.error("[twilio] send failed", res.status, text);
      return false;
    }
    return true;
  } catch (err) {
    console.error("[twilio] send threw", err);
    return false;
  }
}
