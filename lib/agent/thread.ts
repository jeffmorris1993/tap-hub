import "server-only";
import { supabaseAdmin } from "../supabase/server";

export type AgentMessage = { role: "user" | "assistant"; content: string };
export type AgentChannel = "sms" | "email" | "chat" | "web";

/** Keep the last N messages (= N/2 turns) per thread to bound context size. */
const MAX_MESSAGES = 20;

export async function loadThread(channel: AgentChannel, threadKey: string): Promise<AgentMessage[]> {
  const { data, error } = await supabaseAdmin()
    .from("agent_threads")
    .select("messages")
    .eq("channel", channel)
    .eq("thread_key", threadKey)
    .limit(1);
  if (error) {
    console.error("[agent/thread] load failed", error);
    return [];
  }
  const messages = (data?.[0]?.messages ?? []) as AgentMessage[];
  return Array.isArray(messages) ? messages : [];
}

export async function appendToThread(
  channel: AgentChannel,
  threadKey: string,
  newMessages: AgentMessage[],
  opts?: { participantEmail?: string | null },
): Promise<void> {
  const prior = await loadThread(channel, threadKey);
  const all = [...prior, ...newMessages].slice(-MAX_MESSAGES);
  const row: Record<string, unknown> = {
    channel,
    thread_key: threadKey,
    messages: all,
    updated_at: new Date().toISOString(),
  };
  if (opts?.participantEmail) row.participant_email = opts.participantEmail.toLowerCase();
  const { error } = await supabaseAdmin()
    .from("agent_threads")
    .upsert(row, { onConflict: "channel,thread_key" });
  if (error) console.error("[agent/thread] save failed", error);
}

/** Look up the Chat space (or other thread key) for a given staff email. */
export async function findThreadKeyByEmail(
  channel: AgentChannel,
  email: string,
): Promise<string | null> {
  const { data, error } = await supabaseAdmin()
    .from("agent_threads")
    .select("thread_key")
    .eq("channel", channel)
    .eq("participant_email", email.toLowerCase())
    .order("updated_at", { ascending: false })
    .limit(1);
  if (error) {
    console.error("[agent/thread] lookup failed", error);
    return null;
  }
  return (data?.[0]?.thread_key as string | undefined) ?? null;
}

export async function clearThread(channel: AgentChannel, threadKey: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("agent_threads")
    .delete()
    .eq("channel", channel)
    .eq("thread_key", threadKey);
  if (error) console.error("[agent/thread] clear failed", error);
}
