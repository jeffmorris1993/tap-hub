import "server-only";
import { tool } from "ai";
import { z } from "zod";
import { supabaseAdmin } from "../supabase/server";
import { listApproverEmails } from "../approvers";
import { localToUtcIso } from "../tz";
import { recurrenceLabel } from "../events-occurrence";
import {
  notifyApproversOfSubmission,
  notifySubmitterOfApproval,
  notifySubmitterOfRejection,
  type EventSnapshot,
} from "../email/event-approval";
import {
  notifyApproversOfAnnouncementSubmission,
  notifySubmitterOfAnnouncementApproval,
  notifySubmitterOfAnnouncementRejection,
  type AnnouncementSnapshot,
} from "../email/announcement-approval";
import {
  pushSubmissionToApprovers,
  pushApprovalToSubmitter,
  pushRejectionToSubmitter,
  pushAnnouncementSubmissionToApprovers,
  pushAnnouncementApprovalToSubmitter,
  pushAnnouncementRejectionToSubmitter,
} from "../chat-notifications";
import {
  newFieldId,
  parseSignupQuestions,
  validateQuestionConfig,
  type SignupQuestions,
} from "../event-signup-forms";

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

/** One custom signup question as the model supplies it (ids are generated server-side). */
const signupQuestionInput = z.object({
  label: z.string().min(1).describe('The question wording, e.g. "How would you like to help?"'),
  type: z
    .enum(["text", "textarea", "select", "checkboxes"])
    .describe("text = short answer, textarea = paragraph, select = choose one, checkboxes = choose many"),
  required: z.boolean().default(false),
  options: z
    .array(z.string())
    .optional()
    .describe("The choices, for select/checkboxes only. At least one required for those types."),
});

type SignupQuestionInput = z.infer<typeof signupQuestionInput>;

/**
 * Converts the agent's question lists into the stored shape, generating
 * stable ids. Returns the sanitized config, or an error message.
 */
function buildSignupQuestions(
  attendee: SignupQuestionInput[] | undefined,
  volunteer: SignupQuestionInput[] | undefined,
): { ok: true; questions: SignupQuestions } | { ok: false; error: string } {
  const ids: string[] = [];
  const convert = (list: SignupQuestionInput[] | undefined) =>
    (list ?? []).map((q) => {
      const id = newFieldId(q.label, ids);
      ids.push(id);
      return {
        id,
        label: q.label,
        type: q.type,
        required: q.required ?? false,
        ...(q.options ? { options: q.options } : {}),
      };
    });
  const raw = { attendee: convert(attendee), volunteer: convert(volunteer) };
  const problem = validateQuestionConfig(raw);
  if (problem) return { ok: false, error: problem };
  return { ok: true, questions: parseSignupQuestions(raw) };
}

async function snapshotById(id: string): Promise<EventSnapshot | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select("id, slug, title, category, starts_at, location, description_long, cost, recurrence_kind")
    .eq("id", id)
    .limit(1);
  if (error || !data?.[0]) return null;
  const row = data[0] as unknown as EventSnapshot;
  return { ...row, recurrence_label: recurrenceLabel(row.recurrence_kind, row.starts_at) };
}

async function snapshotBySlug(slug: string): Promise<EventSnapshot | null> {
  const { data, error } = await supabaseAdmin()
    .from("events")
    .select("id, slug, title, category, starts_at, location, description_long, cost, recurrence_kind")
    .eq("slug", slug)
    .limit(1);
  if (error || !data?.[0]) return null;
  const row = data[0] as unknown as EventSnapshot;
  return { ...row, recurrence_label: recurrenceLabel(row.recurrence_kind, row.starts_at) };
}

export type AgentContext = {
  /** Current user's email — used to gate approval tools and audit who did what. */
  sender: string;
  /** True when the sender holds the pastoral role (resolved by runAgent). */
  senderIsApprover: boolean;
};

/** Builds the tool set scoped to the calling user. */
export function buildAgentTools(ctx: AgentContext) {
  const senderIsApprover = ctx.senderIsApprover;

  return {
    create_event_draft: tool({
      description:
        "Create a NEW event. By default it's submitted for review immediately. " +
        "If the sender is the Bishop or Assistant Pastor (an approver), the event skips the queue and publishes directly — they do not need their own events approved. " +
        "BEFORE calling this tool, make sure you have explicit answers to all of: title, date, time, location, whether volunteers are needed, and whether there's a cost. If any of those are missing from the conversation, ASK a single short follow-up first instead of guessing.",
      inputSchema: z.object({
        title: z.string().min(1),
        descriptionLong: z.string().min(1),
        category: z
          .enum(["Youth", "Sisterhood", "Brotherhood", "Marriage", "General"])
          .describe(
            "Audience the event is aimed at. Youth = kids/teens or the people serving them (chaperones, youth leaders). Sisterhood = women's ministry. Brotherhood = men's ministry. Marriage = married couples. General = whole church (Sunday worship, all-church events, holiday services). ASK if it's not obvious — don't guess.",
          ),
        startsAtLocal: z
          .string()
          .describe(
            "Local Detroit wall-clock datetime, format YYYY-MM-DDTHH:MM (e.g. '2026-07-04T18:00' = 6:00 PM EDT on July 4). Do NOT convert to UTC — the server interprets this as the church's timezone.",
          ),
        endsAtLocal: z
          .string()
          .optional()
          .describe(
            "Same format as startsAtLocal — local Detroit wall-clock datetime. The server converts to UTC.",
          ),
        location: z.string().min(1),
        acceptsRsvps: z
          .boolean()
          .describe(
            "True if the event should show a public signup / RSVP form. False for informational-only events that visitors just need to know about (e.g. announcements, observances, generic service times). Ask the user — do NOT assume true.",
          ),
        allowVolunteers: z
          .boolean()
          .describe(
            "True if the event is explicitly soliciting volunteer signups (e.g. greeters, kitchen help, ushers, chaperones). Independent of acceptsRsvps — an event can be info-only for attendees but still collect volunteers, or vice versa. Ask the user — do NOT assume true.",
          ),
        cost: z
          .string()
          .nullable()
          .describe(
            "Cost description shown to visitors. Examples: '$15 per person', 'Free will offering', '$10 adults / $5 kids'. Pass null when the event is free. Ask the user if cost wasn't stated.",
          ),
        registrationUrl: z
          .string()
          .optional()
          .describe(
            "Set when attendees register on an external site (Eventbrite, a conference site, a Google Form, etc.). The public event page shows a Register button to this URL — independent of acceptsRsvps/allowVolunteers, so it stacks alongside in-app volunteer signups. acceptsRsvps in this case can stay false: the URL IS the attendee path and the in-app attendee form is hidden when the URL is set. ASK if you suspect external registration (e.g. 'Growth Conference', 'sign up at the link') and the URL wasn't given.",
          ),
        registrationLabel: z
          .string()
          .optional()
          .describe('Optional label for the external Register button. Defaults to "Register" if omitted.'),
        recurrenceKind: z
          .enum(["none", "daily", "weekdays", "weekly", "biweekly", "monthly", "monthly_weekday"])
          .default("none")
          .describe(
            "Use 'daily' for multi-day events that run every day in a range (e.g. a 5-day conference). Use 'weekdays' for Mon–Fri runs (e.g. a 5-week summer program). Use 'weekly'/'biweekly'/'monthly' for a single day-of-week or day-of-month cadence. Use 'monthly_weekday' for patterns like 'every 2nd Friday of the month' — the weekday and week-of-month are derived from startsAtLocal, so startsAtLocal MUST fall on the described day (e.g. an actual 2nd Friday). For 'daily' and 'weekdays' you MUST also set recurrenceUntil to the last day of the series.",
          ),
        /** 0=Sun … 6=Sat; only needed for weekly/biweekly. */
        recurrenceByday: z.number().int().min(0).max(6).optional(),
        recurrenceUntil: isoDate
          .optional()
          .describe(
            "Inclusive last date of the recurrence (e.g. 2026-07-29 for a Jul 24–29 convention). Required for daily/weekdays and optional for weekly/biweekly/monthly.",
          ),
        attendeeQuestions: z
          .array(signupQuestionInput)
          .optional()
          .describe(
            "Custom questions for the ATTENDEE signup form. Omit to keep the standard form (name, contact, notes). The form already asks 'attending for sure?' automatically — never duplicate that.",
          ),
        volunteerQuestions: z
          .array(signupQuestionInput)
          .optional()
          .describe(
            "Custom questions for the VOLUNTEER signup form, e.g. how someone wants to help. Omit to keep the standard form.",
          ),
        submitForApproval: z.boolean().default(true).describe("Submit for review now? Defaults to true."),
        slug: z.string().optional(),
      }),
      execute: async (input) => {
        // Interpret incoming wall-clock times as Detroit-local (not UTC)
        // before persisting. Otherwise "9:00 AM" stored on Vercel ends up
        // as 9 AM UTC = 5 AM EDT in the church's display.
        const startsAtIso = localToUtcIso(input.startsAtLocal);
        if (!startsAtIso) return { ok: false, error: "startsAtLocal is invalid (use YYYY-MM-DDTHH:MM)" };
        const startsAt = new Date(startsAtIso);
        const endsAtIso = input.endsAtLocal ? localToUtcIso(input.endsAtLocal) : null;
        const endsAt = endsAtIso ? new Date(endsAtIso) : null;
        const slug = slugify(input.slug || input.title) || `event-${Date.now()}`;
        const wantsRecurrenceByday =
          input.recurrenceKind === "weekly" || input.recurrenceKind === "biweekly";

        const questionsResult = buildSignupQuestions(input.attendeeQuestions, input.volunteerQuestions);
        if (!questionsResult.ok) return { ok: false, error: questionsResult.error };

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
          accepts_rsvps: input.acceptsRsvps,
          allow_volunteers: input.allowVolunteers,
          registration_url: input.registrationUrl?.trim() ? input.registrationUrl.trim() : null,
          registration_label: input.registrationLabel?.trim() ? input.registrationLabel.trim() : null,
          recurrence_kind: input.recurrenceKind,
          recurrence_byday: wantsRecurrenceByday ? input.recurrenceByday ?? startsAt.getDay() : null,
          recurrence_until: input.recurrenceUntil ?? null,
          signup_questions: questionsResult.questions,
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
            const approvers = await listApproverEmails();
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

    set_event_signup_questions: tool({
      description:
        "REPLACE the custom signup questions on an EXISTING event, found by its slug. " +
        "Use when staff want the RSVP or volunteer form to ask something specific (e.g. 'ask volunteers if they'll bring a decorated trunk, donate candy, or help another way'). " +
        "This replaces the event's whole question set — include every question the event should keep. " +
        "Pass empty arrays to reset a form back to the standard name/contact/notes fields. " +
        "The attend form already asks 'attending for sure?' automatically — never add a duplicate question for that.",
      inputSchema: z.object({
        slug: z.string().min(1).describe("The event's URL slug, e.g. 'harvest-on-the-lot'."),
        attendeeQuestions: z
          .array(signupQuestionInput)
          .default([])
          .describe("Custom questions for the attendee signup form. Empty = standard form."),
        volunteerQuestions: z
          .array(signupQuestionInput)
          .default([])
          .describe("Custom questions for the volunteer signup form. Empty = standard form."),
      }),
      execute: async (input) => {
        const questionsResult = buildSignupQuestions(input.attendeeQuestions, input.volunteerQuestions);
        if (!questionsResult.ok) return { ok: false, error: questionsResult.error };

        const { data, error } = await supabaseAdmin()
          .from("events")
          .update({ signup_questions: questionsResult.questions })
          .eq("slug", input.slug)
          .select("id, slug, title")
          .limit(1);
        if (error) return { ok: false, error: error.message };
        const row = data?.[0];
        if (!row) return { ok: false, error: `No event found with slug "${input.slug}".` };

        const counts = [
          questionsResult.questions.attendee.length &&
            `${questionsResult.questions.attendee.length} attendee question(s)`,
          questionsResult.questions.volunteer.length &&
            `${questionsResult.questions.volunteer.length} volunteer question(s)`,
        ].filter(Boolean);
        const summary = counts.length
          ? `Updated "${row.title}" with ${counts.join(" and ")}.`
          : `Reset "${row.title}" to the standard signup form.`;
        return { ok: true, id: row.id, slug: row.slug, summary };
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

    create_announcement: tool({
      description:
        "Post a one-off announcement (parking lot closure, new members class, choir rehearsal moved, etc.). " +
        "Announcements ALWAYS go through Bishop / Assistant Pastor approval before they appear on the public Announcements tab — except when an approver submits them, in which case they publish immediately. " +
        "Do NOT use this for events that need their own page on /events — use create_event_draft instead. Use create_announcement for short news/notices that don't need RSVPs. " +
        "BEFORE calling, make sure you have: category, a short title, the body, and ideally a display date/when. If any is missing, ASK one short follow-up first.",
      inputSchema: z.object({
        category: z
          .enum(["Youth", "Sisterhood", "Brotherhood", "Marriage", "General"])
          .describe(
            "Pick by primary audience: " +
              "Youth = aimed at our kids/teens or the people serving them (chaperones, youth leaders). " +
              "Sisterhood = aimed at the women's ministry. " +
              "Brotherhood = aimed at the men's ministry. " +
              "Marriage = aimed at married couples (marriage ministry, couples' nights, etc.). " +
              "General = aimed at the whole church (facility updates, all-church events, holiday closures). " +
              "If the sender hasn't made the audience obvious, ASK before posting — don't guess. Urgency is separate: set pinned=true for time-sensitive items, regardless of category.",
          ),
        title: z.string().min(1).max(120),
        body: z.string().min(1).describe("2–5 sentences. Plain text; no markdown."),
        dateLabel: z
          .string()
          .optional()
          .describe(
            'Free-form display date shown on the card, e.g. "Sun, Mar 1 · 10:30 AM", "Jan 6 – 26", "Weekend of Mar 7". Omit when there is no specific date.',
          ),
        pinned: z
          .boolean()
          .default(false)
          .describe("Pin to the top of the Announcements tab. Use sparingly — for the most important items."),
        expiresOn: isoDate
          .optional()
          .describe(
            "Auto-hide the announcement after this date (YYYY-MM-DD). Use for time-bounded notices like a one-weekend parking closure. End of that day, local time.",
          ),
        linkToEventSlug: z
          .string()
          .optional()
          .describe(
            "Preferred way to add a CTA when the announcement references one of our existing events (e.g. a volunteer ask for the Summer Discovery Program). Pass the event's slug — the tool fills in '/events/<slug>' for you. If you don't know the slug, call list_pending_events / list_recent_submissions or ask the user.",
          ),
        linkUrl: z
          .string()
          .optional()
          .describe(
            "Use ONLY when the CTA should point to something that isn't one of our events (an external URL, the give page, etc.). Prefer linkToEventSlug when the link is to an event. Requires actionLabel.",
          ),
        actionLabel: z
          .string()
          .optional()
          .describe(
            'Label for the CTA button, e.g. "Sign up", "Volunteer", "Learn more". Required when linkUrl or linkToEventSlug is set. Default to "Sign up" when linking to an event with RSVPs/volunteers.',
          ),
        submitForApproval: z
          .boolean()
          .default(true)
          .describe("Submit for review now? Defaults to true. Set false to keep as a draft."),
      }),
      execute: async (input) => {
        // Resolve which link wins. linkToEventSlug is preferred. Both
        // require an action label.
        let resolvedLink: string | null = null;
        if (input.linkToEventSlug) {
          resolvedLink = `/events/${input.linkToEventSlug}`;
        } else if (input.linkUrl) {
          resolvedLink = input.linkUrl;
        }
        const resolvedLabel = input.actionLabel ?? (input.linkToEventSlug ? "Sign up" : null);
        if (resolvedLink && !resolvedLabel) {
          return { ok: false, error: "actionLabel is required when a link is set." };
        }

        const wantsToPublishOrSubmit = input.submitForApproval;
        const nowIso = new Date().toISOString();
        const expiresAt = input.expiresOn
          ? new Date(input.expiresOn + "T23:59:59").toISOString()
          : null;

        const payload = {
          category: input.category,
          title: input.title,
          body: input.body,
          date_label: input.dateLabel ?? null,
          expires_at: expiresAt,
          pinned: input.pinned ?? false,
          link_url: resolvedLink,
          action_label: resolvedLink ? resolvedLabel : null,
          approval_status: !wantsToPublishOrSubmit
            ? "draft"
            : senderIsApprover
              ? "approved"
              : "pending",
          submitted_by: wantsToPublishOrSubmit ? ctx.sender : null,
          submitted_at: wantsToPublishOrSubmit ? nowIso : null,
          reviewed_by: wantsToPublishOrSubmit && senderIsApprover ? ctx.sender : null,
          reviewed_at: wantsToPublishOrSubmit && senderIsApprover ? nowIso : null,
          published: wantsToPublishOrSubmit && senderIsApprover,
        };

        const { data, error } = await supabaseAdmin()
          .from("announcements")
          .insert(payload)
          .select("id, title")
          .limit(1);
        if (error) return { ok: false, error: error.message };
        const id = data?.[0]?.id as string;

        // Notify approvers when a non-approver submitted for review.
        if (wantsToPublishOrSubmit && !senderIsApprover) {
          const snap: AnnouncementSnapshot = {
            id,
            category: input.category,
            title: input.title,
            body: input.body,
            date_label: input.dateLabel ?? null,
          };
          const approvers = await listApproverEmails();
          await Promise.all([
            notifyApproversOfAnnouncementSubmission(snap, ctx.sender, approvers),
            pushAnnouncementSubmissionToApprovers(
              { id: snap.id, category: snap.category, title: snap.title, date_label: snap.date_label },
              ctx.sender,
              approvers,
            ),
          ]);
        }

        let summary: string;
        if (!wantsToPublishOrSubmit) {
          summary = `Saved announcement "${input.title}" as a draft. Not submitted yet.`;
        } else if (senderIsApprover) {
          summary = `Posted "${input.title}" to /announcements.`;
        } else {
          summary = `Submitted "${input.title}" for approval. The Bishop and Assistant Pastor have been notified.`;
        }
        return { ok: true, id, summary };
      },
    }),

    list_pending_announcements: tool({
      description:
        "List announcements that are currently waiting on approval. Use when an approver asks 'what announcements need my review' or similar.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabaseAdmin()
          .from("announcements")
          .select("id, category, title, body, date_label, submitted_by, submitted_at")
          .eq("approval_status", "pending")
          .order("submitted_at", { ascending: true });
        if (error) return { ok: false, error: error.message };
        return { ok: true, count: data?.length ?? 0, announcements: data ?? [] };
      },
    }),

    approve_announcement: tool({
      description:
        "Approve a pending announcement so it appears on /announcements. RESTRICTED to approvers. Identify by id (from list_pending_announcements) or by exact title.",
      inputSchema: z.object({
        id: z.string().uuid().optional(),
        title: z.string().min(1).optional(),
      }),
      execute: async ({ id, title }) => {
        if (!senderIsApprover) {
          return { ok: false, error: "Only the Bishop or Assistant Pastor can approve announcements." };
        }
        if (!id && !title) return { ok: false, error: "Pass either id or title." };
        const sb = supabaseAdmin();
        const query = sb
          .from("announcements")
          .select("id, category, title, body, date_label, approval_status, submitted_by")
          .limit(1);
        const { data, error } = id ? await query.eq("id", id) : await query.eq("title", title!);
        if (error) return { ok: false, error: error.message };
        const row = data?.[0] as
          | {
              id: string;
              category: AnnouncementSnapshot["category"];
              title: string;
              body: string;
              date_label: string | null;
              approval_status: string;
              submitted_by: string | null;
            }
          | undefined;
        if (!row) return { ok: false, error: "No matching announcement found." };
        if (row.approval_status === "approved") {
          return { ok: false, error: `"${row.title}" is already approved.` };
        }
        const upd = await sb
          .from("announcements")
          .update({
            approval_status: "approved",
            reviewed_by: ctx.sender,
            reviewed_at: new Date().toISOString(),
            approval_notes: null,
            published: true,
          })
          .eq("id", row.id);
        if (upd.error) return { ok: false, error: upd.error.message };

        if (row.submitted_by && row.submitted_by !== ctx.sender) {
          const snap: AnnouncementSnapshot = {
            id: row.id,
            category: row.category,
            title: row.title,
            body: row.body,
            date_label: row.date_label,
          };
          await Promise.all([
            notifySubmitterOfAnnouncementApproval(snap, row.submitted_by, ctx.sender),
            pushAnnouncementApprovalToSubmitter(
              { id: snap.id, category: snap.category, title: snap.title, date_label: snap.date_label },
              row.submitted_by,
              ctx.sender,
            ),
          ]);
        }
        return { ok: true, summary: `Approved "${row.title}". It's live on /announcements.` };
      },
    }),

    reject_announcement: tool({
      description:
        "Reject a pending announcement with notes for the submitter. RESTRICTED to approvers. Pass id or title plus notes.",
      inputSchema: z.object({
        id: z.string().uuid().optional(),
        title: z.string().min(1).optional(),
        notes: z.string().min(1).describe("Short explanation of what needs to change."),
      }),
      execute: async ({ id, title, notes }) => {
        if (!senderIsApprover) {
          return { ok: false, error: "Only the Bishop or Assistant Pastor can reject announcements." };
        }
        if (!id && !title) return { ok: false, error: "Pass either id or title." };
        const sb = supabaseAdmin();
        const query = sb
          .from("announcements")
          .select("id, category, title, body, date_label, submitted_by")
          .limit(1);
        const { data, error } = id ? await query.eq("id", id) : await query.eq("title", title!);
        if (error) return { ok: false, error: error.message };
        const row = data?.[0] as
          | {
              id: string;
              category: AnnouncementSnapshot["category"];
              title: string;
              body: string;
              date_label: string | null;
              submitted_by: string | null;
            }
          | undefined;
        if (!row) return { ok: false, error: "No matching announcement found." };
        const upd = await sb
          .from("announcements")
          .update({
            approval_status: "rejected",
            reviewed_by: ctx.sender,
            reviewed_at: new Date().toISOString(),
            approval_notes: notes,
            published: false,
          })
          .eq("id", row.id);
        if (upd.error) return { ok: false, error: upd.error.message };

        if (row.submitted_by && row.submitted_by !== ctx.sender) {
          const snap: AnnouncementSnapshot = {
            id: row.id,
            category: row.category,
            title: row.title,
            body: row.body,
            date_label: row.date_label,
          };
          await Promise.all([
            notifySubmitterOfAnnouncementRejection(snap, row.submitted_by, ctx.sender, notes),
            pushAnnouncementRejectionToSubmitter(
              { id: snap.id, category: snap.category, title: snap.title, date_label: snap.date_label },
              row.submitted_by,
              ctx.sender,
              notes,
            ),
          ]);
        }
        return { ok: true, summary: `Rejected "${row.title}" and notified the submitter.` };
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
