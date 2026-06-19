"use server";

import { getAdminUser } from "../../../../lib/supabase/auth";
import { runAgent, type AgentMessage, type AgentRunResult } from "../../../../lib/agent";
import { revalidatePath } from "next/cache";

export async function runAgentFromWeb(
  text: string,
  history: AgentMessage[],
): Promise<AgentRunResult> {
  const user = await getAdminUser();
  if (!user) {
    return { text: "Not authorized.", toolCalls: [], status: "error", error: "auth" };
  }
  const result = await runAgent({
    channel: "web",
    sender: user.email ?? "(unknown)",
    text,
    history,
  });
  // Revalidate any surface the agent may have touched.
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/events");
  revalidatePath("/kids-youth");
  revalidatePath("/admin");
  revalidatePath("/admin/agent-log");
  return result;
}
