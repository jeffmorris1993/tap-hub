import { supabaseAdmin } from "../../../../lib/supabase/server";
import { TodayEditor } from "./TodayEditor";

export const dynamic = "force-dynamic";

export default async function AdminToday() {
  const sb = supabaseAdmin();
  const [week, evenings] = await Promise.all([
    sb
      .from("week_lookahead")
      .select("id, day_label, title, detail, sort_order")
      .order("sort_order", { ascending: true }),
    sb
      .from("schedule_today")
      .select("id, label, location, starts_at_minutes, active_from, active_until")
      .eq("kind", "evening")
      .order("active_from", { ascending: true }),
  ]);

  return (
    <TodayEditor
      week={week.data ?? []}
      evenings={evenings.data ?? []}
    />
  );
}
