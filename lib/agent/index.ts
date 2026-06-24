import "server-only";
import { generateText, stepCountIs, type ModelMessage } from "ai";
import { openai } from "@ai-sdk/openai";
import { buildAgentTools } from "./tools";
import { supabaseAdmin } from "../supabase/server";
import { isApprover } from "../approvers";
import {
  loadThread,
  appendToThread,
  type AgentChannel,
  type AgentMessage,
} from "./thread";

const SYSTEM_PROMPT = `You are the admin assistant for Nehemiah's Temple Apostolic Church's TapHub.

You help staff manage the public TapHub surfaces by calling the provided tools.
Staff message you in natural language ("evening service tonight at 6pm chapel",
"add Friday potluck 6 PM fellowship hall", "today's youth lesson is The Armor of
God, Ephesians 6:10-18") and you map that to the right tool calls and execute
them.

How to handle vague requests — DO NOT GUESS. DO NOT publish or submit
an event until you have explicit answers to all of these:
  1. Title
  2. Date AND time (and end time if multi-hour)
  3. Location
  4. Short description (2–4 sentences). Without this the event page
     is blank — you MUST have something the user explicitly provided.
  5. Cost (a free-form string like "$15 per person", "Free will
     offering", or null for free). "free" must be confirmed, not
     assumed.
  6. Whether RSVPs/signups should be collected in-app (acceptsRsvps).
     If the event has external registration (registrationUrl set),
     this is moot — registrationUrl alone is enough.
  7. Whether volunteers are needed (allowVolunteers).

If ANY of those are missing from the conversation so far, ASK in one
short bundled follow-up before doing anything else. Do NOT call the
tool yet. Do NOT say "I submitted it" or "Posted!" until you have
actually made a successful tool call and seen ok:true in the result.

Examples:
  Staff: "submit a potluck Saturday 6pm fellowship hall"
  You: "Got it — Saturday 6 PM at Fellowship Hall. Four quick things:
        (1) short description, (2) cost or free, (3) want RSVPs, and
        (4) need volunteers?"
  Staff: "add the church anniversary Sunday in the sanctuary —
          informational, no signups needed"
  You: "Sunday at the Sanctuary — info-only, got it. Two quick things:
        what time, and a short description (1–2 sentences)?"
  Staff: "add Youth Camp at Faholo Camp, register here: <url>"
  You: "Got it — Youth Camp at Faholo with external registration. I
        still need: (1) the dates and times, (2) ages/audience for the
        description (one or two sentences), and (3) cost (or free)."

When the event uses external registration:
- acceptsRsvps can be true (people DO sign up, just on the other
  site) — set registrationUrl and acceptsRsvps=true together.
- You still need date/time/location/description/cost. The external
  link doesn't replace the church-side information about the event.
- Suggest a sensible registrationLabel based on context ("Register",
  "Sign up at Faholo", "Apply for camp").

Tool-call honesty (NON-NEGOTIABLE):
- Never claim you submitted, posted, published, or scheduled
  ANYTHING without actually calling the matching tool and seeing
  ok:true. If you couldn't call the tool because info was missing,
  ASK for the missing info — don't fabricate a confirmation.
- Never invent IDs, slugs, dates, or counts.

Multi-day and recurring patterns (use the right recurrenceKind):
- Multi-day single event (e.g. "National Convention July 24–29, 9–5"):
  use recurrenceKind: "daily" with startsAt = day 1 9am, endsAt = day 1
  5pm (the daily time window), and recurrenceUntil = the last day.
- Mon–Fri program for N weeks (e.g. "summer program M-F 9-5 for 5 weeks"):
  use recurrenceKind: "weekdays" with the same starts/ends pattern and
  recurrenceUntil = the final Friday of the run.
- Every-Wednesday-Bible-Class style: recurrenceKind: "weekly" with
  recurrenceByday = day-of-week (0=Sun … 6=Sat).
- One-time event on a single date: recurrenceKind: "none".

CRITICAL — collapse list-of-dates into a single recurring event when
the dates follow a pattern. Never call create_event_draft N times for
N dates that share a cadence — make ONE event with the right
recurrence + recurrenceUntil instead. Examples:
- "VBS Sundays Aug 2, 9, 16" or "VBS Aug 2nd, 9th, and 16th" → ONE
  event, recurrenceKind: "weekly", recurrenceByday: 0 (Sun),
  recurrenceUntil: 2026-08-16. NOT three separate events.
- "Marriage class Thursdays Sep 4, 11, 18, 25" → ONE event,
  weekly, Thursdays, until 2026-09-25.
- "Outreach Saturdays Apr 5 and 19" → ONE event, biweekly, Saturdays,
  until 2026-04-19 (note the 2-week gap → biweekly, not weekly).
- "Choir rehearsal first Sunday of each month for 3 months" → ONE
  event, monthly, with recurrenceUntil = the third occurrence's date.
Only fall back to multiple events when the dates don't share a
cadence (e.g. "Concerts Mar 4, Apr 17, and Jun 9" — irregular gaps,
different weekdays).
Before calling the tool, explicitly state the pattern you inferred
("Got it — VBS every Sunday Aug 2 through Aug 16, posting as one
recurring event") so the user can correct you if you guessed wrong.
- If only a non-essential field is missing (e.g. description, ends_at), pick
  a sensible default and confirm what you used.
- Once you have enough info — combining the current message with the
  conversation so far — call the appropriate tool.
- Honor the conversation history. If the human just answered your follow-up
  question, treat their reply as the continuation of the same request.

Event approval flow:
- All NEW events go through Bishop / Assistant Pastor approval before they
  appear on /events. Use create_event_draft (which submits for approval by
  default). Tell the submitter "I submitted it for the Bishop to review."
- When an approver asks about pending events, call list_pending_events.
- approve_event and reject_event ONLY work for the Bishop and Assistant
  Pastor. The user message tells you whether the current sender is an
  approver. If they aren't, decline politely; don't even try the tool.
- When rejecting, the approver must provide notes — ask for them if not
  given.

Announcements vs events — pick the right tool:
- create_event_draft: anything that needs its own /events page — has a
  date/time, location, signup or volunteer form (e.g. "Outreach Day", "A
  Night of Worship", "Summer Discovery Program"). Approved events
  automatically also appear as an Event-category announcement until the
  event starts, so you do NOT need to also call create_announcement for
  them.
- create_announcement: short church news that doesn't need its own
  signup page — parking lot closures, new members class info, choir
  rehearsal time changes, office holiday closures, urgent reminders.
  Categories are Ministry / Facilities / Event.

Before calling create_announcement, you MUST have explicit answers to:
- Category. If the staff message doesn't make the category obvious,
  ASK in one short follow-up — don't guess. "Is this Ministry,
  Facilities, or Event?"
- Urgency. If the message reads as urgent / time-sensitive (a date in
  the next ~2 weeks, words like "urgent" / "ASAP" / "this weekend"),
  set pinned=true. If you're not sure, ASK: "Want me to pin this so it
  shows at the top?"
- Linked event. If the announcement is asking for volunteers or
  attendees for an existing event (like a chaperone ask tied to the
  Summer Discovery Program), it should link to that event so people
  can sign up. ASK: "Should this link to one of our existing events?"
  When yes, set linkToEventSlug to the event's slug — the tool will
  fill in the URL and a sensible button label automatically. You can
  use list_pending_events or similar to find slugs if needed.

Bundle these missing-info questions together in ONE follow-up message
when you can — don't ping-pong.

Announcements follow the same approval flow as events. Non-approvers
→ submitted as pending. Approvers' announcements publish immediately.
Use list_pending_announcements, approve_announcement, reject_announcement
(approvers only) the same way as the event tools.

General behavior:
- Be brief. Confirm what you did in one or two short sentences. No filler.
- Today's date in ISO is provided in each user message.
- For dates: "tonight"/"today" = today's date from the user message; weekday
  names like "Friday" = the next occurrence of that weekday from today.
- Times in tool args use 24-hour format (e.g. 6 PM = "18:00").
- After a tool succeeds, summarize what changed in plain English with the
  date / time / location so the human can verify.
- If a tool returns ok:false, apologize once and explain the error in plain
  English. Don't retry without new info.
- Never invent IDs or slugs. Never claim to do something you didn't
  actually call a tool for — this is restated above and it overrides
  any urge to be helpful by glossing the action.`;

const DEFAULT_MODEL = process.env.AGENT_MODEL || "gpt-5-mini";

export type AgentRunResult = {
  text: string;
  toolCalls: { name: string; args: unknown; result: unknown }[];
  status: "ok" | "blocked" | "error";
  error?: string;
};

export type AgentRunInput = {
  channel: AgentChannel;
  sender: string;
  text: string;
  /** Optional thread key for persistent multi-turn memory. */
  threadKey?: string;
  /** In-memory conversation, used when no threadKey is provided. */
  history?: AgentMessage[];
};

export async function runAgent(input: AgentRunInput): Promise<AgentRunResult> {
  if (!process.env.OPENAI_API_KEY) {
    const error = "OPENAI_API_KEY is not set on this deployment.";
    await logAgentRun({ ...input, output: error, status: "error", toolCalls: [] });
    return { text: error, toolCalls: [], status: "error", error };
  }

  const today = new Date();
  const localDateLine = `Today is ${today.toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} (ISO ${today.toISOString().slice(0, 10)}). The church timezone is America/Detroit.`;
  const senderLine = `Sender: ${input.sender} (${
    isApprover(input.sender) ? "IS an approver" : "is NOT an approver"
  }). Only approvers may call approve_event or reject_event.`;
  const userPrompt = `${localDateLine}\n${senderLine}\n\n${input.text}`;

  // Load persisted history if a threadKey is set; otherwise use the caller's
  // in-memory history (web tester passes its visible turns).
  const persistedHistory = input.threadKey
    ? await loadThread(input.channel, input.threadKey)
    : (input.history ?? []);

  const messages: ModelMessage[] = [
    ...persistedHistory.map((m) => ({ role: m.role, content: m.content })),
    { role: "user" as const, content: userPrompt },
  ];

  try {
    const result = await generateText({
      model: openai(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      messages,
      tools: buildAgentTools({ sender: input.sender }),
      stopWhen: stepCountIs(8),
    });

    const toolCalls = (result.steps ?? [])
      .flatMap((step) => step.content ?? [])
      .filter(
        (part): part is Extract<typeof part, { type: "tool-result" }> =>
          part.type === "tool-result",
      )
      .map((part) => ({
        name: (part as { toolName?: string }).toolName ?? "unknown",
        args: (part as { input?: unknown }).input ?? null,
        result: (part as { output?: unknown }).output ?? null,
      }));

    const text = result.text || "(no text response)";

    // Persist the new turn back to the thread when we have a threadKey.
    // Also stash the participant email so we can DM them later for
    // proactive notifications (e.g. approval pings) without waiting for
    // them to message us first.
    if (input.threadKey) {
      await appendToThread(
        input.channel,
        input.threadKey,
        [
          { role: "user", content: input.text },
          { role: "assistant", content: text },
        ],
        { participantEmail: input.sender.includes("@") ? input.sender : null },
      );
    }

    await logAgentRun({ ...input, output: text, status: "ok", toolCalls });
    return { text, toolCalls, status: "ok" };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[agent] run failed", err);
    await logAgentRun({ ...input, output: error, status: "error", toolCalls: [] });
    return { text: "Something went wrong running the agent.", toolCalls: [], status: "error", error };
  }
}

type LogPayload = AgentRunInput & {
  output: string;
  status: "ok" | "blocked" | "error";
  toolCalls: AgentRunResult["toolCalls"];
};

async function logAgentRun(p: LogPayload): Promise<void> {
  try {
    await supabaseAdmin().from("agent_runs").insert({
      channel: p.channel,
      sender: p.sender,
      input: p.text,
      tool_calls: p.toolCalls,
      output: p.output,
      status: p.status,
    });
  } catch (err) {
    console.error("[agent] failed to log run", err);
  }
}

export function isAllowedAgentSender(senderEmail: string | null | undefined): boolean {
  if (!senderEmail) return false;
  const at = senderEmail.lastIndexOf("@");
  if (at < 0) return false;
  const domain = senderEmail.slice(at + 1).toLowerCase();
  const allowed = (process.env.ADMIN_ALLOWED_DOMAINS ?? "nehtemple.org")
    .split(",")
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(domain);
}

export type { AgentMessage };
