"use server";

import { revalidatePath } from "next/cache";
import { getAdminUser } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";

async function requireAdmin() {
  const u = await getAdminUser();
  if (!u) throw new Error("Not authorized");
}

export type WeekItemInput = {
  id?: string;
  day_label: string;
  title: string;
  detail: string;
  sort_order: number;
};

export async function saveWeekItem(input: WeekItemInput): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const sb = supabaseAdmin();
  const payload = {
    day_label: input.day_label.trim(),
    title: input.title.trim(),
    detail: input.detail.trim(),
    sort_order: input.sort_order,
  };
  if (!payload.day_label || !payload.title) return { ok: false, error: "Day and title are required." };
  if (input.id) {
    const { error } = await sb.from("week_lookahead").update(payload).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await sb.from("week_lookahead").insert(payload);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/today");
  revalidatePath("/admin/today");
  return { ok: true };
}

export async function deleteWeekItem(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabaseAdmin().from("week_lookahead").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/admin/today");
}

export type EveningInput = {
  id?: string;
  /** ISO date "YYYY-MM-DD" — both active_from and active_until set to this. */
  date: string;
  /** Time string "HH:MM" 24h. */
  time: string;
  label: string;
  location: string;
};

function timeToMinutes(t: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!m) return null;
  const h = parseInt(m[1], 10);
  const min = parseInt(m[2], 10);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}

export async function saveEvening(input: EveningInput): Promise<{ ok: boolean; error?: string }> {
  await requireAdmin();
  const sb = supabaseAdmin();
  const date = input.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: "Date is invalid." };
  const minutes = timeToMinutes(input.time);
  if (minutes === null) return { ok: false, error: "Time is invalid (use HH:MM)." };
  const dow = new Date(`${date}T12:00:00`).getDay();

  const payload = {
    day_of_week: dow,
    kind: "evening" as const,
    label: input.label.trim() || "Evening Worship",
    starts_at_minutes: minutes,
    duration_minutes: 90,
    location: input.location.trim() || "Main Sanctuary",
    active_from: date,
    active_until: date,
  };

  if (input.id) {
    const { error } = await sb.from("schedule_today").update(payload).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await sb.from("schedule_today").insert(payload);
    if (error) return { ok: false, error: error.message };
  }
  revalidatePath("/today");
  revalidatePath("/");
  revalidatePath("/admin/today");
  return { ok: true };
}

export async function deleteEvening(id: string): Promise<void> {
  await requireAdmin();
  const { error } = await supabaseAdmin().from("schedule_today").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/today");
  revalidatePath("/");
  revalidatePath("/admin/today");
}
