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
): Promise<void> {
  const prior = await loadThread(channel, threadKey);
  const all = [...prior, ...newMessages].slice(-MAX_MESSAGES);
  const { error } = await supabaseAdmin()
    .from("agent_threads")
    .upsert(
      {
        channel,
        thread_key: threadKey,
        messages: all,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "channel,thread_key" },
    );
  if (error) console.error("[agent/thread] save failed", error);
}

export async function clearThread(channel: AgentChannel, threadKey: string): Promise<void> {
  const { error } = await supabaseAdmin()
    .from("agent_threads")
    .delete()
    .eq("channel", channel)
    .eq("thread_key", threadKey);
  if (error) console.error("[agent/thread] clear failed", error);
}
