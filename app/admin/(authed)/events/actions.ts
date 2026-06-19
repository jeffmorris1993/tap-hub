"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminUser } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";

export type EventFormInput = {
  id?: string;
  slug: string;
  title: string;
  description_long: string;
  category: "Worship" | "Youth" | "Community";
  /** ISO datetime-local string (e.g. "2026-04-05T12:00") in local time. */
  starts_at_local: string;
  ends_at_local: string;
  location: string;
  allow_volunteers: boolean;
  published: boolean;
};

export type EventActionResult = { ok: true; id: string } | { ok: false; error: string };

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function toIso(localValue: string): string | null {
  if (!localValue) return null;
  const d = new Date(localValue);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

async function requireAdmin(): Promise<void> {
  const user = await getAdminUser();
  if (!user) throw new Error("Not authorized");
}

export async function saveEvent(input: EventFormInput): Promise<EventActionResult> {
  await requireAdmin();
  const sb = supabaseAdmin();

  const title = input.title.trim();
  const description_long = input.description_long.trim();
  const location = input.location.trim();
  const slug = (input.slug.trim() || slugify(title)) || `event-${Date.now()}`;
  const starts_at = toIso(input.starts_at_local);
  if (!title) return { ok: false, error: "Title is required." };
  if (!description_long) return { ok: false, error: "Description is required." };
  if (!starts_at) return { ok: false, error: "Start time is invalid." };
  if (!location) return { ok: false, error: "Location is required." };
  const ends_at = toIso(input.ends_at_local);

  const payload = {
    slug: slugify(slug),
    title,
    description_long,
    category: input.category,
    starts_at,
    ends_at,
    location,
    allow_volunteers: input.allow_volunteers,
    published: input.published,
  };

  if (input.id) {
    const { error } = await sb.from("events").update(payload).eq("id", input.id);
    if (error) {
      console.error("[admin/events] update failed", error);
      return { ok: false, error: error.message };
    }
    revalidatePath("/events");
    revalidatePath(`/events/${payload.slug}`);
    revalidatePath("/admin/events");
    return { ok: true, id: input.id };
  }

  const { data, error } = await sb.from("events").insert(payload).select("id").limit(1);
  if (error) {
    console.error("[admin/events] insert failed", error);
    return { ok: false, error: error.message };
  }
  revalidatePath("/events");
  revalidatePath("/admin/events");
  return { ok: true, id: data?.[0]?.id ?? "" };
}

export async function deleteEvent(id: string): Promise<void> {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { error } = await sb.from("events").delete().eq("id", id);
  if (error) {
    console.error("[admin/events] delete failed", error);
    throw new Error(error.message);
  }
  revalidatePath("/events");
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function togglePublished(id: string, published: boolean): Promise<void> {
  await requireAdmin();
  const sb = supabaseAdmin();
  const { error } = await sb.from("events").update({ published }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  revalidatePath("/admin/events");
}
