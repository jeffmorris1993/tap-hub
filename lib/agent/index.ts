import "server-only";
import { generateText, stepCountIs } from "ai";
import { openai } from "@ai-sdk/openai";
import { agentTools } from "./tools";
import { supabaseAdmin } from "../supabase/server";

const SYSTEM_PROMPT = `You are the admin assistant for Nehemiah's Temple Apostolic Church's TapHub.

You help staff manage the public TapHub surfaces by calling the provided tools.
Staff message you in natural language ("evening service tonight at 6pm chapel",
"add Friday potluck 6 PM fellowship hall", "today's youth lesson is The Armor of
God, Ephesians 6:10-18") and you map that to the right tool calls and execute
them.

Behavior rules:
- Be brief. Confirm what you did in one or two short sentences. No filler.
- If a request needs a tool, call it. Don't ask follow-ups unless something
  genuinely critical is missing (date, time, title).
- Today's date in ISO is provided in the user message.
- For dates: if the user says "tonight"/"today", use the date from the user
  message; if they say a weekday, infer the next occurrence of that weekday
  from today's date.
- Times in tool args use 24-hour format (e.g. 6 PM = "18:00").
- After a tool succeeds, summarize what changed in plain English. Mention the
  date/time/location so the human can verify.
- If a tool returns ok:false, apologize once and explain the error in plain
  English. Don't retry without new info.
- Never invent IDs. Never claim to do something you didn't actually call a
  tool for.`;

const DEFAULT_MODEL = process.env.AGENT_MODEL || "gpt-4o-mini";

export type AgentRunResult = {
  text: string;
  toolCalls: { name: string; args: unknown; result: unknown }[];
  status: "ok" | "blocked" | "error";
  error?: string;
};

export type AgentRunInput = {
  channel: "sms" | "email" | "chat" | "web";
  sender: string;
  text: string;
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

  const userPrompt = `${localDateLine}\n\n${input.text}`;

  try {
    const result = await generateText({
      model: openai(DEFAULT_MODEL),
      system: SYSTEM_PROMPT,
      prompt: userPrompt,
      tools: agentTools,
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
