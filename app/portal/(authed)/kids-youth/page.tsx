import { redirect } from "next/navigation";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { requireLead } from "../../../../lib/portal-auth";
import { LessonEditor } from "./LessonEditor";

export const dynamic = "force-dynamic";

export default async function AdminKidsYouth() {
  const pu = await requireLead();
  // Kids + Youth is a Youth-ministry surface.
  if (pu.role !== "pastoral" && !pu.ministries.includes("Youth")) redirect("/portal");
  const { data } = await supabaseAdmin()
    .from("kids_lesson")
    .select("id, lesson_date, topic, reference, teacher")
    .order("lesson_date", { ascending: false })
    .limit(10);
  return <LessonEditor recent={data ?? []} />;
}
