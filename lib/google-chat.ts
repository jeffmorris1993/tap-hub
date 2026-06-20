import "server-only";
import { GoogleAuth } from "google-auth-library";

const CHAT_SCOPE = "https://www.googleapis.com/auth/chat.bot";

let cachedAuth: GoogleAuth | null = null;
let cachedAuthError = false;

function getAuth(): GoogleAuth | null {
  if (cachedAuth) return cachedAuth;
  if (cachedAuthError) return null;
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!raw) {
    cachedAuthError = true;
    return null;
  }
  try {
    const credentials = JSON.parse(raw);
    cachedAuth = new GoogleAuth({ credentials, scopes: [CHAT_SCOPE] });
    return cachedAuth;
  } catch (err) {
    console.error("[google-chat] failed to parse GOOGLE_SERVICE_ACCOUNT_JSON", err);
    cachedAuthError = true;
    return null;
  }
}

export type ChatMessageBody =
  | { text: string }
  | { cardsV2: Array<{ cardId: string; card: Record<string, unknown> }> };

/**
 * Post a message to a Google Chat space as the bot. Returns true on
 * success. Failures are logged but never thrown — proactive Chat
 * notifications are best-effort by design.
 */
export async function sendChatMessage(
  spaceName: string,
  body: ChatMessageBody,
): Promise<boolean> {
  const auth = getAuth();
  if (!auth) {
    console.warn("[google-chat] skipped: GOOGLE_SERVICE_ACCOUNT_JSON not configured");
    return false;
  }
  // spaceName is like "spaces/AAAA1234" — accept both with and without prefix.
  const space = spaceName.startsWith("spaces/") ? spaceName : `spaces/${spaceName}`;
  const url = `https://chat.googleapis.com/v1/${space}/messages`;
  try {
    const client = await auth.getClient();
    const res = await client.request({ url, method: "POST", data: body });
    return res.status >= 200 && res.status < 300;
  } catch (err) {
    console.error("[google-chat] send failed for", space, err);
    return false;
  }
}

/** Convenience: send a text message + a "view in admin" link as a card. */
export async function sendChatNotification(
  spaceName: string,
  opts: {
    headline: string;
    body: string;
    ctaLabel?: string;
    ctaUrl?: string;
  },
): Promise<boolean> {
  if (!opts.ctaUrl) {
    return sendChatMessage(spaceName, { text: `*${opts.headline}*\n\n${opts.body}` });
  }
  return sendChatMessage(spaceName, {
    cardsV2: [
      {
        cardId: "taphub-notification",
        card: {
          header: { title: opts.headline },
          sections: [
            { widgets: [{ textParagraph: { text: opts.body } }] },
            {
              widgets: [
                {
                  buttonList: {
                    buttons: [
                      {
                        text: opts.ctaLabel ?? "Open in admin",
                        onClick: { openLink: { url: opts.ctaUrl } },
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      },
    ],
  });
}
