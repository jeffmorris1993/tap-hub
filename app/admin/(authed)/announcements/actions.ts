"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import type { AnnouncementCategory } from "../../../../lib/announcement-types";

export type AnnouncementInput = {
  id?: string;
  category: AnnouncementCategory;
  title: string;
  body: string;
  date_label: string | null;
  expires_at: string | null; // ISO date or datetime, or null
  pinned: boolean;
  published: boolean;
  link_url: string | null;
  action_label: string | null;
};

export type AnnouncementResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

async function requireAdmin() {
  const user = await getAdminUser();
  if (!user) throw new Error("Not authorized");
  return user;
}

export async function saveAnnouncement(input: AnnouncementInput): Promise<AnnouncementResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Not authorized." };
  }

  const title = input.title.trim();
  if (!title) return { ok: false, error: "Title is required." };
  const body = input.body.trim();
  if (!body) return { ok: false, error: "Body is required." };
  const dateLabel = input.date_label?.trim() || null;
  const linkUrl = input.link_url?.trim() || null;
  const actionLabel = input.action_label?.trim() || null;
  if (linkUrl && !actionLabel) {
    return { ok: false, error: "Add a label for the action button (or remove the link)." };
  }

  const payload = {
    category: input.category,
    title,
    body,
    date_label: dateLabel,
    expires_at: input.expires_at,
    pinned: input.pinned,
    published: input.published,
    link_url: linkUrl,
    action_label: actionLabel,
  };

  const sb = supabaseAdmin();
  if (input.id) {
    const { error } = await sb.from("announcements").update(payload).eq("id", input.id);
    if (error) return { ok: false, error: error.message };
    revalidatePath("/announcements");
    revalidatePath("/");
    revalidatePath("/admin/announcements");
    return { ok: true, id: input.id };
  }

  const { data, error } = await sb
    .from("announcements")
    .insert(payload)
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/announcements");
  revalidatePath("/");
  revalidatePath("/admin/announcements");
  return { ok: true, id: (data as { id: string }).id };
}

export async function deleteAnnouncement(id: string): Promise<void> {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { error } = await sb.from("announcements").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/announcements");
  revalidatePath("/");
  revalidatePath("/admin/announcements");
  redirect("/admin/announcements");
}
