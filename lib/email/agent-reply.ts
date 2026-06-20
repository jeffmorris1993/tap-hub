import "server-only";
import { Resend } from "resend";
import { renderBrandedEmail, type Field } from "./template";

const DEFAULT_FROM = "TapHub Agent <agent@nehtemple.org>";

export type AgentReplyInput = {
  to: string;
  subject: string;
  reply: string;
  toolCallsCount: number;
  /** RFC 822 Message-ID of the inbound email (without angle brackets). */
  inReplyTo?: string | null;
};

/**
 * Send the agent's response back to the staff member who emailed it.
 * Threading: we set In-Reply-To + References so Gmail/Outlook keep the
 * conversation as a single thread. The Subject mirrors the incoming
 * subject with "Re:" prefixed if not already there.
 */
export async function sendAgentReply(input: AgentReplyInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn("[agent-reply] RESEND_API_KEY not set");
    return;
  }
  const from = process.env.AGENT_REPLY_FROM || DEFAULT_FROM;
  const subject = /^re:\s/i.test(input.subject) ? input.subject : `Re: ${input.subject}`;

  const meta: Field[] = [];
  if (input.toolCallsCount > 0) {
    meta.push({
      label: "Tool calls",
      value:
        input.toolCallsCount === 1
          ? "1 action taken on TapHub"
          : `${input.toolCallsCount} actions taken on TapHub`,
    });
  }

  const html = renderBrandedEmail({
    eyebrow: "TapHub Agent",
    headline: "Reply from your assistant",
    body: { label: "Response", content: input.reply },
    fields: meta,
    footnote: "Reply to this email to keep the conversation going.",
  });

  const text = [
    input.reply,
    "",
    "—",
    "Reply to keep the conversation going.",
  ].join("\n");

  const headers = input.inReplyTo
    ? {
        "In-Reply-To": `<${input.inReplyTo}>`,
        References: `<${input.inReplyTo}>`,
      }
    : undefined;

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from,
      to: input.to,
      subject,
      text,
      html,
      headers,
    });
    if (error) console.error("[agent-reply] resend error", error);
  } catch (err) {
    console.error("[agent-reply] failed", err);
  }
}
