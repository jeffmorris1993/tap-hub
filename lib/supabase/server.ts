// Placeholder for the Supabase server client.
// Wired up in Phase 2 after the Marketplace bootstrap provisions env vars.
//
// import { createServerClient } from "@supabase/ssr";
// import { cookies } from "next/headers";
//
// export async function getSupabaseServer() {
//   const cookieStore = await cookies();
//   return createServerClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
//     { cookies: { /* … */ } },
//   );
// }
//
// export function getSupabaseAdmin() {
//   return createClient(
//     process.env.NEXT_PUBLIC_SUPABASE_URL!,
//     process.env.SUPABASE_SERVICE_ROLE_KEY!,
//     { auth: { persistSession: false } },
//   );
// }

export {};
