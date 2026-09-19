import "server-only";

/**
 * Event-approval gate. The Bishop and Assistant Pastor (or whoever the
 * church designates) are listed in EVENT_APPROVER_EMAILS as a
 * comma-separated list. Only these addresses can approve or reject an
 * event from any surface (web admin, agent, etc).
 */

export function getApproverEmails(): string[] {
  return (process.env.EVENT_APPROVER_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isApprover(email: string | null | undefined): boolean {
  if (!email) return false;
  return getApproverEmails().includes(email.toLowerCase());
}

/**
 * Everyone who should be NOTIFIED about pending approvals: pastoral-role
 * profiles plus the env bootstrap list. (Authorization checks use the
 * portal role, not this list.)
 */
export async function listApproverEmails(): Promise<string[]> {
  const { supabaseAdmin } = await import("./supabase/server");
  const { data } = await supabaseAdmin().from("profiles").select("email").eq("role", "pastoral");
  const fromProfiles = (data ?? []).map((r) => String(r.email).toLowerCase());
  return [...new Set([...fromProfiles, ...getApproverEmails()])];
}
