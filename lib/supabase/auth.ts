import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { SupabaseClient } from "@supabase/supabase-js";

function env() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or anon key");
  return { url, key };
}

/** Cookie-bound Supabase client for Server Components and Server Actions. */
export async function supabaseSession(): Promise<SupabaseClient> {
  const { url, key } = env();
  const cookieStore = await cookies();
  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components can't mutate cookies; route handlers / actions can.
        }
      },
    },
  });
}

/**
 * Staff-domain check: true when the email's domain is in
 * ADMIN_ALLOWED_DOMAINS. This no longer gates portal ACCESS (members sign in
 * with any email) — it gates ELIGIBILITY for the lead/pastoral roles. See
 * lib/portal-auth.ts for the role model.
 */
export function isAllowedAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  const at = email.lastIndexOf("@");
  if (at < 0) return false;
  const domain = email.slice(at + 1).toLowerCase();
  const allowed = (process.env.ADMIN_ALLOWED_DOMAINS ?? "nehtemple.org")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(domain);
}
