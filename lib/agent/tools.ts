import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "../supabase/server";

/**
 * Tool definitions exposed to the LLM. Each tool wraps a single Supabase
 * write and returns a structured result so the agent can confirm what
 * happened. Every tool execution is logged into `agent_runs` by the
 * caller in lib/agent/index.ts.
 */

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 80);
}

function todayIso(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().slice(0, 10);
}

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD")
  .describe("ISO date, e.g. 2026-04-05");

const time24 = z
  .string()
  .regex(/^([0-1]?\d|2[0-3]):[0-5]\d$/, "Use HH:MM (24-hour)")
  .describe("24-hour time, e.g. 18:00 for 6 PM");

function timeToMinutes(t: string): number {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

export const agentTools = {
  add_evening_service: tool({
    description:
      "Schedule a one-off evening or special service for a specific date. Use this when staff says things like 'evening service tonight at 6 pm in the chapel' or 'add a watch night service Dec 31 at 10 pm'.",
    inputSchema: z.object({
      date: isoDate,
      time: time24,
      label: z.string().min(1).default("Evening Worship").describe("Service name shown to visitors"),
      location: z.string().min(1).default("Main Sanctuary"),
      durationMinutes: z.number().int().positive().max(360).default(90),
    }),
    execute: async ({ date, time, label, location, durationMinutes }) => {
      const dow = new Date(`${date}T12:00:00`).getDay();
      const { error } = await supabaseAdmin().from("schedule_today").insert({
        day_of_week: dow,
        kind: "evening",
        label,
        starts_at_minutes: timeToMinutes(time),
        duration_minutes: durationMinutes,
        location,
        active_from: date,
        active_until: date,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, summary: `Added "${label}" on ${date} at ${time} (${location}).` };
    },
  }),

  add_week_lookahead: tool({
    description:
      "Add an item to 'Coming Up This Week' on the Today page. Use this for things like 'add Friday potluck 6 PM Fellowship Hall'.",
    inputSchema: z.object({
      dayLabel: z.string().min(1).describe("Short day label shown on the card, e.g. 'Wed', 'Fri'"),
      title: z.string().min(1),
      detail: z.string().default(""),
      sortOrder: z.number().int().default(0),
    }),
    execute: async ({ dayLabel, title, detail, sortOrder }) => {
      const { error } = await supabaseAdmin().from("week_lookahead").insert({
        day_label: dayLabel,
        title,
        detail,
        sort_order: sortOrder,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, summary: `Added "${title}" (${dayLabel}) to this week.` };
    },
  }),

  create_event: tool({
    description:
      "Create a new event for the Events page. Use for 'add Resurrection Sunday Apr 5 at noon main sanctuary' kinds of requests. Defaults to published=true.",
    inputSchema: z.object({
      title: z.string().min(1),
      descriptionLong: z.string().min(1).describe("Long-form description shown on the detail page"),
      category: z.enum(["Worship", "Youth", "Community"]),
      /** ISO datetime "YYYY-MM-DDTHH:MM" in local time. */
      startsAtLocal: z.string().describe("Local datetime YYYY-MM-DDTHH:MM"),
      endsAtLocal: z.string().optional(),
      location: z.string().min(1),
      allowVolunteers: z.boolean().default(true),
      published: z.boolean().default(true),
      slug: z.string().optional().describe("URL slug; auto-generated from title if omitted"),
    }),
    execute: async (input) => {
      const startsAt = new Date(input.startsAtLocal);
      if (isNaN(startsAt.getTime())) return { ok: false, error: "startsAtLocal is invalid" };
      const endsAt = input.endsAtLocal ? new Date(input.endsAtLocal) : null;
      const slug = slugify(input.slug || input.title) || `event-${Date.now()}`;
      const { data, error } = await supabaseAdmin()
        .from("events")
        .insert({
          slug,
          title: input.title,
          description_long: input.descriptionLong,
          category: input.category,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt && !isNaN(endsAt.getTime()) ? endsAt.toISOString() : null,
          location: input.location,
          allow_volunteers: input.allowVolunteers,
          published: input.published,
        })
        .select("id, slug, title")
        .limit(1);
      if (error) return { ok: false, error: error.message };
      return {
        ok: true,
        summary: `Created "${data?.[0]?.title}" (slug: ${data?.[0]?.slug}).`,
        id: data?.[0]?.id,
      };
    },
  }),

  set_kids_lesson: tool({
    description:
      "Post the Ignite teaching topic for a given Sunday. Use for 'today's lesson is The Armor of God, Ephesians 6:10-18'.",
    inputSchema: z.object({
      lessonDate: isoDate.default(todayIso()),
      topic: z.string().min(1),
      reference: z.string().min(1).describe("Bible reference, e.g. 'Ephesians 6:10–18'"),
      teacher: z.string().default("").describe("Teacher or context line"),
    }),
    execute: async ({ lessonDate, topic, reference, teacher }) => {
      const { error } = await supabaseAdmin().from("kids_lesson").insert({
        lesson_date: lessonDate,
        topic,
        reference,
        teacher,
      });
      if (error) return { ok: false, error: error.message };
      return { ok: true, summary: `Posted lesson "${topic}" (${reference}) for ${lessonDate}.` };
    },
  }),

  list_recent_submissions: tool({
    description:
      "Get a quick count of recent inbox items (last 24 hours). Use for 'how many prayer requests this week' or 'any new visitors today'.",
    inputSchema: z.object({
      hours: z.number().int().positive().max(24 * 30).default(24),
    }),
    execute: async ({ hours }) => {
      const sb = supabaseAdmin();
      const since = new Date(Date.now() - hours * 60 * 60 * 1000).toISOString();
      const [v, p, f, s] = await Promise.all([
        sb.from("visitors").select("*", { count: "exact", head: true }).gte("created_at", since),
        sb.from("prayer_requests").select("*", { count: "exact", head: true }).gte("created_at", since),
        sb.from("feedback").select("*", { count: "exact", head: true }).gte("created_at", since),
        sb.from("event_signups").select("*", { count: "exact", head: true }).gte("created_at", since),
      ]);
      return {
        ok: true,
        windowHours: hours,
        counts: {
          visitors: v.count ?? 0,
          prayerRequests: p.count ?? 0,
          feedback: f.count ?? 0,
          eventSignups: s.count ?? 0,
        },
      };
    },
  }),
} as const;

export type AgentToolName = keyof typeof agentTools;
