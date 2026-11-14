import "server-only";
import { supabaseAdmin } from "./supabase/server";
import { normalizeEmails } from "./event-notify";

/**
 * Who designs flyers: every profile holding the 'flyer' capability, unioned
 * with FLYER_DESIGNER_EMAILS (comma-separated env bootstrap, mirroring
 * EVENT_APPROVER_EMAILS). The env entry means Carmen hears about requests
 * even before she has signed in once and been granted the capability.
 */
export async function listFlyerDesignerEmails(): Promise<string[]> {
  const fromEnv = (process.env.FLYER_DESIGNER_EMAILS ?? "").split(",");

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("email")
    .contains("capabilities", ["flyer"]);
  if (error) {
    console.error("[flyer-designers] profile lookup failed", error);
  }
  const fromProfiles = (data ?? []).map((r) => (r as { email: string | null }).email);

  return normalizeEmails([...fromEnv, ...fromProfiles]);
}
