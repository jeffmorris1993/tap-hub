"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";

async function requireAdmin() {
  const u = await getAdminUser();
  if (!u) throw new Error("Not authorized");
}

export type LessonInput = {
  lesson_date: string; // YYYY-MM-DD
  topic: string;
  reference: string;
  teacher: string;
};

export async function saveLesson(input: LessonInput): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
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
  revalidatePath("/admin/kids-youth");
  return { ok: true };
}
