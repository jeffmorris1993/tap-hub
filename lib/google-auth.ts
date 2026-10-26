import "server-only";

/**
 * Shared Google service-account token minting (used by Chat + Calendar).
 * Supports two auth modes:
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
 * Failures are logged but never thrown — all Google pushes are best-effort.
 */

const STS_URL = "https://sts.googleapis.com/v1/token";

type TokenCache = { token: string; expiresAt: number };
// Tokens are scope-bound, so the cache is keyed by the sorted scope set.
const cachedTokens = new Map<string, TokenCache>();

function buildWifAudience(): string | null {
  const projectNumber = process.env.GCP_PROJECT_NUMBER;
  const pool = process.env.GCP_WORKLOAD_IDENTITY_POOL;
  const provider = process.env.GCP_WORKLOAD_IDENTITY_PROVIDER;
  if (!projectNumber || !pool || !provider) return null;
  return `//iam.googleapis.com/projects/${projectNumber}/locations/global/workloadIdentityPools/${pool}/providers/${provider}`;
}

export async function getGoogleAccessToken(
  scopes: string[],
  logTag = "google-auth",
): Promise<string | null> {
  const cacheKey = [...scopes].sort().join(" ");
  const cached = cachedTokens.get(cacheKey);
  if (cached && cached.expiresAt > Date.now() + 60_000) {
    return cached.token;
  }

  // Path A: WIF via Vercel OIDC (preferred)
  const oidc = process.env.VERCEL_OIDC_TOKEN;
  const audience = buildWifAudience();
  const sa = process.env.GCP_SERVICE_ACCOUNT_EMAIL;
  if (oidc && audience && sa) {
    return await mintTokenViaWif(oidc, audience, sa, scopes, cacheKey, logTag);
  }

  // Path B: Service account JSON key (fallback)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    return await mintTokenViaKey(scopes, cacheKey, logTag);
  }

  console.warn(
    `[${logTag}] no auth configured. Set Vercel OIDC + GCP WIF env vars, ` +
      "or GOOGLE_SERVICE_ACCOUNT_JSON.",
  );
  return null;
}

async function mintTokenViaWif(
  oidcToken: string,
  audience: string,
  serviceAccountEmail: string,
  scopes: string[],
  cacheKey: string,
  logTag: string,
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
      console.error(`[${logTag}] STS exchange failed`, stsRes.status, await stsRes.text());
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
      body: JSON.stringify({ scope: scopes }),
    });
    if (!impRes.ok) {
      console.error(`[${logTag}] SA impersonation failed`, impRes.status, await impRes.text());
      return null;
    }
    const imp = (await impRes.json()) as { accessToken: string; expireTime: string };
    cachedTokens.set(cacheKey, {
      token: imp.accessToken,
      expiresAt: new Date(imp.expireTime).getTime(),
    });
    return imp.accessToken;
  } catch (err) {
    console.error(`[${logTag}] WIF flow threw`, err);
    return null;
  }
}

async function mintTokenViaKey(
  scopes: string[],
  cacheKey: string,
  logTag: string,
): Promise<string | null> {
  try {
    const { GoogleAuth } = await import("google-auth-library");
    const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON as string);
    const auth = new GoogleAuth({ credentials, scopes });
    const client = await auth.getClient();
    const tokenRes = await client.getAccessToken();
    if (!tokenRes.token) return null;
    cachedTokens.set(cacheKey, {
      token: tokenRes.token,
      // GoogleAuth handles refresh internally; cache for 50 min as a hint.
      expiresAt: Date.now() + 50 * 60 * 1000,
    });
    return tokenRes.token;
  } catch (err) {
    console.error(`[${logTag}] key-file auth failed`, err);
    return null;
  }
}
