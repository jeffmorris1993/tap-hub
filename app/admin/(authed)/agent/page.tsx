import { AgentTester } from "./AgentTester";

export const dynamic = "force-dynamic";

const EXAMPLES = [
  "Add an evening service tonight at 6 PM in the main sanctuary",
  "Add Saturday men's prayer breakfast 8:30 AM in the fellowship hall",
  "Create a Resurrection Sunday event on April 5 at noon in the main sanctuary. It's a worship service.",
  "Post this week's Ignite lesson: The Armor of God, Ephesians 6:10–18, led by the Ignite team",
  "How many new visitors today?",
];

export default function AgentPage() {
  return (
    <div>
      <h1
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "32px",
          lineHeight: 1,
          marginBottom: "6px",
        }}
      >
        Agent
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "14px", marginBottom: "24px", maxWidth: "640px" }}>
        Talk to the TapHub assistant in plain English. It can schedule evening services, add this-week
        items, create events, post the weekly lesson, and check the inbox. Every message and the tools it
        calls are logged to <code style={{ color: "#cdd3e0" }}>/admin/agent-log</code>.
      </p>
      <AgentTester examples={EXAMPLES} />
    </div>
  );
}
