"use server";

import { getPortalUser } from "../../../../lib/portal-auth";
import { runAgent, type AgentMessage, type AgentRunResult } from "../../../../lib/agent";
import { revalidatePath } from "next/cache";

export async function runAgentFromWeb(
  text: string,
  history: AgentMessage[],
): Promise<AgentRunResult> {
  const pu = await getPortalUser();
  if (!pu || pu.role !== "pastoral") {
    return { text: "Not authorized.", toolCalls: [], status: "error", error: "auth" };
  }
  const result = await runAgent({
    channel: "web",
    sender: pu.email || "(unknown)",
    text,
    history,
  });
  // Revalidate any surface the agent may have touched.
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/events");
  revalidatePath("/kids-youth");
  revalidatePath("/portal");
  revalidatePath("/portal/agent-log");
  return result;
}
