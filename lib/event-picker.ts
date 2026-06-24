import "server-only";
import { supabaseAdmin } from "./supabase/server";

export type EventPickerOption = {
  slug: string;
  title: string;
  /** Display hint like "Jul 13, 2026" for the dropdown label. */
  startsAtLabel: string;
};

/** Lightweight list for action-link pickers: every approved + published
 *  event, newest start first. We include events whose start is in the
 *  past too, so an admin can link to an ongoing program like the Summer
 *  Discovery Program — the event still exists on /events, only the
 *  announcement-auto-rendering rule hides it. */
export async function listLinkableEvents(): Promise<EventPickerOption[]> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select("slug, title, starts_at")
    .eq("published", true)
    .eq("approval_status", "approved")
    .order("starts_at", { ascending: false })
    .limit(50);
  if (error) throw error;
  return (data ?? []).map((r) => {
    const row = r as { slug: string; title: string; starts_at: string };
    const startsAtLabel = new Date(row.starts_at).toLocaleDateString("en-US", {
      timeZone: "America/Detroit",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    return { slug: row.slug, title: row.title, startsAtLabel };
  });
}
