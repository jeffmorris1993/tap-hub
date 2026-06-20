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

const CHAT_SCOPE = "https://www.googleapis.com/auth/chat.bot";
const STS_URL = "https://sts.googleapis.com/v1/token";

type TokenCache = { token: string; expiresAt: number };
let cachedToken: TokenCache | null = null;

function buildWifAudience(): string | null {
  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const pool = process.env.GCP_WORKLOAD_IDENTITY_POOL;
  const provider = process.env.GCP_WORKLOAD_IDENTITY_PROVIDER;
  if (!projectNumber || !pool || !provider) return null;
  return `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`;
}

async function getAccessToken(): Promise<string | null> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.token;
  }

  // Path A: WIF via Vercel OIDC (preferred)
  const oidc = process.env.VERCEL_OIDC_TOKEN;
  const audience = buildWifAudience();
  const sa = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (oidc && audience && sa) {
    return await mintTokenViaWif(oidc, audience, sa);
  }

  // Path B: Service account JSON key (fallback)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return await mintTokenViaKey();
  }

  console.warn(
    "[google-chat] no auth configured. Set Vercel OIDC + GCP WIF env vars, " +
      "or GOOGLE_SERVICE_ACCOUNT_JSON.",
  );
  return null;
}

async function mintTokenViaWif(
  oidcToken: string,
  audience: string,
  serviceAccountEmail: string,
): Promise<string | null> {
  try {
    // Step 1: exchange the Vercel OIDC JWT for a Google "federated" access token
    const stsBody = new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:token-exchange",
      audience,
      scope: "https://www.googleapis.com/auth/cloud-platform",
      requested_token_type: "urn:ietf:params:oauth:token-type:access_token",
      subject_token: oidcToken,
      subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    });
    const stsRes = await fetch(STS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: stsBody,
    });
    if (!stsRes.ok) {
      console.error(
        "[google-chat] STS exchange failed",
        stsRes.status,
        await stsRes.text(),
      );
      return null;
    }
    const sts = (await stsRes.json()) as { access_token: string };

    // Step 2: use the federated token to mint a service-account access token
    const impUrl = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccountEmail}:generateAccessToken`;
    const impRes = await fetch(impUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sts.access_token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ scope: [CHAT_SCOPE] }),
    });
    if (!impRes.ok) {
      console.error(
        "[google-chat] SA impersonation failed",
        impRes.status,
        await impRes.text(),
      );
      return null;
    }
    const imp = (await impRes.json()) as { accessToken: string; expireTime: string };
    cachedToken = {
      token: imp.accessToken,
      expiresAt: new Date(imp.expireTime).getTime(),
    };
    return imp.accessToken;
  } catch (err) {
    console.error("[google-chat] WIF flow threw", err);
    return null;
  }
}

async function mintTokenViaKey(): Promise<string | null> {
  try {
    const { GoogleAuth } = await import("google-auth-library");
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON as string);
    const auth = new GoogleAuth({ credentials, scopes: [CHAT_SCOPE] });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (!tokenRes.token) return null;
    cachedToken = {
      token: tokenRes.token,
      // GoogleAuth handles refresh internally; cache for 50 min as a hint.
      expiresAt: Date.now() + 50 * 60 * 1000,
    };
    return tokenRes.token;
  } catch (err) {
    console.error("[google-chat] key-file auth failed", err);
    return null;
  }
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
