import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "../supabase/server";
import { isApprover, getApproverEmails } from "../approvers";
import { recurrenceLabel } from "../events-occurrence";
import {
  notifyApproversOfSubmission,
  notifySubmitterOfApproval,
  notifySubmitterOfRejection,
  type EventSnapshot,
} from "../email/event-approval";
import {
  pushSubmissionToApprovers,
  pushApprovalToSubmitter,
  pushRejectionToSubmitter,
} from "../chat-notifications";

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

async function snapshotById(id: string): Promise<EventSnapshot | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select("id, slug, title, category, starts_at, location, description_long, cost, recurrence_kind")
    .eq("id", id)
    .limit(1);
  if (error || !data?.[0]) return null;
  const row = data[0] as unknown as EventSnapshot & {
    recurrence_kind: "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly";
  };
  return { ...row, recurrence_label: recurrenceLabel(row.recurrence_kind) };
}

async function snapshotBySlug(slug: string): Promise<EventSnapshot | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select("id, slug, title, category, starts_at, location, description_long, cost, recurrence_kind")
    .eq("slug", slug)
    .limit(1);
  if (error || !data?.[0]) return null;
  const row = data[0] as unknown as EventSnapshot & {
    recurrence_kind: "none" | "daily" | "weekdays" | "weekly" | "biweekly" | "monthly";
  };
  return { ...row, recurrence_label: recurrenceLabel(row.recurrence_kind) };
}

export type AgentContext = {
  /** Current user's email — used to gate approval tools and audit who did what. */
  sender: string;
};

/** Builds the tool set scoped to the calling user. */
export function buildAgentTools(ctx: AgentContext) {
  const senderIsApprover = isApprover(ctx.sender);

  return {
    add_evening_service: tool({
      description:
        "Schedule a one-off evening or special service for a specific date. Use when staff says things like 'evening service tonight at 6 pm in the chapel' or 'add a watch night service Dec 31 at 10 pm'.",
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
        "Add an item to 'Coming Up This Week' on the Today page. Use for things like 'add Friday potluck 6 PM Fellowship Hall'.",
      inputSchema: z.object({
        dayLabel: z.string().min(1).describe("Short day label, e.g. 'Wed', 'Fri'"),
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

    create_event_draft: tool({
      description:
        "Create a NEW event. By default it's submitted for review immediately. " +
        "If the sender is the Bishop or Assistant Pastor (an approver), the event skips the queue and publishes directly — they do not need their own events approved. " +
        "BEFORE calling this tool, make sure you have explicit answers to all of: title, date, time, location, whether volunteers are needed, and whether there's a cost. If any of those are missing from the conversation, ASK a single short follow-up first instead of guessing.",
      inputSchema: z.object({
        title: z.string().min(1),
        descriptionLong: z.string().min(1),
        category: z.enum(["Worship", "Youth", "Community"]),
        startsAtLocal: z.string().describe("Local datetime YYYY-MM-DDTHH:MM"),
        endsAtLocal: z.string().optional(),
        location: z.string().min(1),
        allowVolunteers: z
          .boolean()
          .describe(
            "True if the event is explicitly soliciting volunteer signups (e.g. greeters, kitchen help, ushers). False otherwise. Ask the user — do NOT assume true.",
          ),
        cost: z
          .string()
          .nullable()
          .describe(
            "Cost description shown to visitors. Examples: '$15 per person', 'Free will offering', '$10 adults / $5 kids'. Pass null when the event is free. Ask the user if cost wasn't stated.",
          ),
        recurrenceKind: z
          .enum(["none", "daily", "weekdays", "weekly", "biweekly", "monthly"])
          .default("none")
          .describe(
            "Use 'daily' for multi-day events that run every day in a range (e.g. a 5-day conference). Use 'weekdays' for Mon–Fri runs (e.g. a 5-week summer program). Use 'weekly'/'biweekly'/'monthly' for a single day-of-week or day-of-month cadence. For 'daily' and 'weekdays' you MUST also set recurrenceUntil to the last day of the series.",
          ),
        /** 0=Sun … 6=Sat; only needed for weekly/biweekly. */
        recurrenceByday: z.number().int().min(0).max(6).optional(),
        recurrenceUntil: isoDate
          .optional()
          .describe(
            "Inclusive last date of the recurrence (e.g. 2026-07-29 for a Jul 24–29 convention). Required for daily/weekdays and optional for weekly/biweekly/monthly.",
          ),
        submitForApproval: z.boolean().default(true).describe("Submit for review now? Defaults to true."),
        slug: z.string().optional(),
      }),
      execute: async (input) => {
        const startsAt = new Date(input.startsAtLocal);
        if (isNaN(startsAt.getTime())) return { ok: false, error: "startsAtLocal is invalid" };
        const endsAt = input.endsAtLocal ? new Date(input.endsAtLocal) : null;
        const slug = slugify(input.slug || input.title) || `event-${Date.now()}`;
        const wantsRecurrenceByday =
          input.recurrenceKind === "weekly" || input.recurrenceKind === "biweekly";

        // Approvers' own events skip the queue and publish directly. The
        // submitForApproval input still toggles "publish now vs. save as
        // draft" for them — it just maps to approved+published instead of
        // pending.
        const wantsToPublishOrSubmit = input.submitForApproval;
        const isSenderApprover = senderIsApprover;
        const nowIso = new Date().toISOString();

        const insertPayload = {
          slug,
          title: input.title,
          description_long: input.descriptionLong,
          category: input.category,
          starts_at: startsAt.toISOString(),
          ends_at: endsAt && !isNaN(endsAt.getTime()) ? endsAt.toISOString() : null,
          location: input.location,
          cost: input.cost?.trim() ? input.cost.trim() : null,
          allow_volunteers: input.allowVolunteers,
          recurrence_kind: input.recurrenceKind,
          recurrence_byday: wantsRecurrenceByday ? input.recurrenceByday ?? startsAt.getDay() : null,
          recurrence_until: input.recurrenceUntil ?? null,
          approval_status: !wantsToPublishOrSubmit
            ? "draft"
            : isSenderApprover
              ? "approved"
              : "pending",
          submitted_by: wantsToPublishOrSubmit ? ctx.sender : null,
          submitted_at: wantsToPublishOrSubmit ? nowIso : null,
          reviewed_by: wantsToPublishOrSubmit && isSenderApprover ? ctx.sender : null,
          reviewed_at: wantsToPublishOrSubmit && isSenderApprover ? nowIso : null,
          published: wantsToPublishOrSubmit && isSenderApprover,
        };

        const { data, error } = await supabaseAdmin()
          .from("events")
          .insert(insertPayload)
          .select("id, slug, title")
          .limit(1);
        if (error) return { ok: false, error: error.message };
        const id = data?.[0]?.id as string;

        // Only notify approvers when a non-approver submitted for review.
        if (wantsToPublishOrSubmit && !isSenderApprover) {
          const snap = await snapshotById(id);
          if (snap) {
            const approvers = getApproverEmails();
            await Promise.all([
              notifyApproversOfSubmission(snap, ctx.sender, approvers),
              pushSubmissionToApprovers(
                {
                  id: snap.id,
                  slug: snap.slug,
                  title: snap.title,
                  category: snap.category,
                  starts_at: snap.starts_at,
                  location: snap.location,
                  recurrence_kind: snap.recurrence_kind,
                },
                ctx.sender,
                approvers,
              ),
            ]);
          }
        }

        let summary: string;
        if (!wantsToPublishOrSubmit) {
          summary = `Created "${input.title}" as a draft. Not submitted yet.`;
        } else if (isSenderApprover) {
          summary = `Created "${input.title}" and published it. It's live on /events now.`;
        } else {
          summary = `Created "${input.title}" and submitted it for approval. The Bishop and Assistant Pastor have been notified.`;
        }

        return { ok: true, id, slug, summary };
      },
    }),

    list_pending_events: tool({
      description:
        "List events that are currently waiting on approval. Use when an approver asks 'what's waiting on me' or 'show me pending events'.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabaseAdmin()
          .from("events")
          .select("slug, title, starts_at, location, submitted_by, submitted_at")
          .eq("approval_status", "pending")
          .order("submitted_at", { ascending: true });
        if (error) return { ok: false, error: error.message };
        return { ok: true, count: data?.length ?? 0, events: data ?? [] };
      },
    }),

    approve_event: tool({
      description:
        "Approve an event so it becomes visible on /events. RESTRICTED to approvers (Bishop / Assistant Pastor). Identify the event by its slug or title.",
      inputSchema: z.object({
        slug: z.string().min(1).describe("Event slug from list_pending_events"),
      }),
      execute: async ({ slug }) => {
        if (!senderIsApprover) {
          return {
            ok: false,
            error: "Only the Bishop or Assistant Pastor can approve events.",
          };
        }
        const sb = supabaseAdmin();
        const { data: pre } = await sb
          .from("events")
          .select("id, submitted_by, approval_status")
          .eq("slug", slug)
          .limit(1);
        const row = pre?.[0] as
          | { id: string; submitted_by?: string | null; approval_status?: string }
          | undefined;
        if (!row) return { ok: false, error: `No event found with slug "${slug}".` };
        if (row.approval_status === "approved")
          return { ok: false, error: `"${slug}" is already approved.` };

        const { error } = await sb
          .from("events")
          .update({
            approval_status: "approved",
            reviewed_by: ctx.sender,
            reviewed_at: new Date().toISOString(),
            approval_notes: null,
            published: true,
          })
          .eq("id", row.id);
        if (error) return { ok: false, error: error.message };

        const snap = await snapshotById(row.id);
        if (snap && row.submitted_by) {
          await Promise.all([
            notifySubmitterOfApproval(snap, row.submitted_by, ctx.sender),
            pushApprovalToSubmitter(
              {
                id: snap.id,
                slug: snap.slug,
                title: snap.title,
                category: snap.category,
                starts_at: snap.starts_at,
                location: snap.location,
                recurrence_kind: snap.recurrence_kind,
              },
              row.submitted_by,
              ctx.sender,
            ),
          ]);
        }
        return { ok: true, summary: `Approved "${slug}". It is now live on /events.` };
      },
    }),

    reject_event: tool({
      description:
        "Reject an event and send the submitter notes on what to change. RESTRICTED to approvers.",
      inputSchema: z.object({
        slug: z.string().min(1),
        notes: z.string().min(1).describe("Explain what needs to change before this can be approved."),
      }),
      execute: async ({ slug, notes }) => {
        if (!senderIsApprover) {
          return { ok: false, error: "Only the Bishop or Assistant Pastor can reject events." };
        }
        const sb = supabaseAdmin();
        const { data: pre } = await sb
          .from("events")
          .select("id, submitted_by")
          .eq("slug", slug)
          .limit(1);
        const row = pre?.[0] as { id: string; submitted_by?: string | null } | undefined;
        if (!row) return { ok: false, error: `No event found with slug "${slug}".` };

        const { error } = await sb
          .from("events")
          .update({
            approval_status: "rejected",
            reviewed_by: ctx.sender,
            reviewed_at: new Date().toISOString(),
            approval_notes: notes,
            published: false,
          })
          .eq("id", row.id);
        if (error) return { ok: false, error: error.message };

        const snap = await snapshotById(row.id);
        if (snap && row.submitted_by) {
          await Promise.all([
            notifySubmitterOfRejection(snap, row.submitted_by, ctx.sender, notes),
            pushRejectionToSubmitter(
              {
                id: snap.id,
                slug: snap.slug,
                title: snap.title,
                category: snap.category,
                starts_at: snap.starts_at,
                location: snap.location,
                recurrence_kind: snap.recurrence_kind,
              },
              row.submitted_by,
              ctx.sender,
              notes,
            ),
          ]);
        }
        return { ok: true, summary: `Rejected "${slug}" and notified the submitter.` };
      },
    }),

    set_kids_lesson: tool({
      description:
        "Post the Ignite teaching topic for a given Sunday. Use for 'today's lesson is The Armor of God, Ephesians 6:10-18'.",
      inputSchema: z.object({
        lessonDate: isoDate.default(todayIso()),
        topic: z.string().min(1),
        reference: z.string().min(1),
        teacher: z.string().default(""),
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
        "Quick count of recent inbox items. Use for 'how many prayer requests this week' or 'any new visitors today'.",
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
}

export type AgentTools = ReturnType<typeof buildAgentTools>;
