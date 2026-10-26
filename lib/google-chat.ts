import "server-only";

/**
 * Google Chat sender. Supports two auth modes:
 *
 *   1. Service Account JSON key  (GOOGLE_SERVICE_ACCOUNT_JSON)
 *      Legacy. Blocked by orgs that enforce
 *      constraints/iam.disableServiceAccountKeyCreation.
 *
 *   2. Workload Identity Federation (Vercel OIDC → GCP)
 *      Preferred. No static keys. Needs these env vars:
 *        - GCP_PROJECT_NUMBER
 *        - GCP_WORKLOAD_IDENTITY_POOL
 *        - GCP_WORKLOAD_IDENTITY_PROVIDER
 *        - GCP_SERVICE_ACCOUNT_EMAIL
 *      Plus VERCEL_OIDC_TOKEN, which Vercel auto-injects when OIDC
 *      Federation is enabled in the project's Security settings.
 *
 * Failures are logged but never thrown — Chat pushes are best-effort.
 */

import { getGoogleAccessToken } from "./google-auth";

const CHAT_SCOPE = "https://www.googleapis.com/auth/chat.bot";

async function getAccessToken(): Promise<string | null> {
  return getGoogleAccessToken([CHAT_SCOPE], "google-chat");
}

export type ChatMessageBody =
  | { text: string }
  | { cardsV2: Array<{ cardId: string; card: Record<string, unknown> }> };

export async function sendChatMessage(
  spaceName: string,
  body: ChatMessageBody,
): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;
  const space = spaceName.startsWith("spaces/") ? spaceName : `spaces/${spaceName}`;
  const url = `https://chat.googleapis.com/v1/${space}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      console.error(
        "[google-chat] chat.messages.create failed",
        res.status,
        await res.text(),
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error("[google-chat] chat.messages.create threw", err);
    return false;
  }
}

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
