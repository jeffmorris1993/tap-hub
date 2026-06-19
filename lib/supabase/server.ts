import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-side admin client using the service role key. Bypasses RLS — only
 * use in Server Actions / route handlers, never expose to the browser. We
 * intentionally read public surfaces with this client too (no auth in Phase 2)
 * for simplicity; switching to an anon client per-request is straightforward
 * later if we want to enforce RLS in the read paths.
 */
let cached: SupabaseClient | null = null;

export function supabaseAdmin(): SupabaseClient {
  if (cached) return cached;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. " +
        "Run `npx vercel env pull .env.local` to sync.",
    );
  }
  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
