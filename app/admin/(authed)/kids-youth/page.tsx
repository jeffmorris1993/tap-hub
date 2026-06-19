import { supabaseAdmin } from "../../../../lib/supabase/server";
import { LessonEditor } from "./LessonEditor";

export const dynamic = "force-dynamic";

export default async function AdminKidsYouth() {
  const { data } = await supabaseAdmin()
    .from("kids_lesson")
    .select("id, lesson_date, topic, reference, teacher")
    .order("lesson_date", { ascending: false })
    .limit(10);
  return <LessonEditor recent={data ?? []} />;
}
