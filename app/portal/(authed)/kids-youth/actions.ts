"use server";

import { revalidatePath } from "next/cache";
import { assertLead } from "../../../../lib/portal-auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";

/** Kids + Youth is a Youth-ministry surface: Youth leads or pastoral. */
async function requireKidsYouthStaff() {
  const pu = await assertLead();
  if (pu.role !== "pastoral" && !pu.ministries.includes("Youth")) {
    throw new Error("Not authorized");
  }
}

export type LessonInput = {
  lesson_date: string; // YYYY-MM-DD
  topic: string;
  reference: string;
  teacher: string;
};

export async function saveLesson(input: LessonInput): Promise<{ ok: boolean; error?: string }> {
  await requireKidsYouthStaff();
  const topic = input.topic.trim();
  const reference = input.reference.trim();
  const teacher = input.teacher.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.lesson_date)) return { ok: false, error: "Date is invalid." };
  if (!topic) return { ok: false, error: "Topic is required." };
  if (!reference) return { ok: false, error: "Reference is required." };

  const { error } = await supabaseAdmin().from("kids_lesson").insert({
    lesson_date: input.lesson_date,
    topic,
    reference,
    teacher,
  });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/kids-youth");
  revalidatePath("/portal/kids-youth");
  return { ok: true };
}
