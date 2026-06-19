"use client";

import { useState, useTransition } from "react";
import { runAgentFromWeb } from "./actions";
import type { AgentRunResult } from "../../../../lib/agent";

type Turn = {
  id: number;
  user: string;
  result: AgentRunResult;
};

export function AgentTester({ examples }: { examples: string[] }) {
  const [input, setInput] = useState("");
  const [turns, setTurns] = useState<Turn[]>([]);
  const [pending, startTransition] = useTransition();

  function send(text: string) {
    if (!text.trim()) return;
    const history = turns.flatMap((t) => [
      { role: "user" as const, content: t.user },
      { role: "assistant" as const, content: t.result.text },
    ]);
    startTransition(async () => {
      const result = await runAgentFromWeb(text, history);
      setTurns((prev) => [...prev, { id: Date.now(), user: text, result }]);
      setInput("");
    });
  }

  function resetThread() {
    setTurns([]);
    setInput("");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    send(input);
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 300px", gap: "20px" }}>
      <div>
        <div
          style={{
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "14px",
            padding: "18px",
            minHeight: "300px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {turns.length === 0 && (
            <div style={{ color: "#9aa3b8", fontSize: "14px", textAlign: "center", padding: "60px 16px" }}>
              No messages yet. Try one of the examples on the right.
            </div>
          )}
          {turns.map((t) => (
            <div key={t.id} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div
                style={{
                  alignSelf: "flex-end",
                  background: "#1a2438",
                  border: "1px solid rgba(244,241,234,.1)",
                  borderRadius: "12px 12px 4px 12px",
                  padding: "10px 14px",
                  maxWidth: "85%",
                  fontSize: "13.5px",
                  color: "#f4f1ea",
                }}
              >
                {t.user}
              </div>
              <div
                style={{
                  alignSelf: "flex-start",
                  background: t.result.status === "error" ? "rgba(181,50,65,.1)" : "rgba(231,184,78,.08)",
                  border: `1px solid ${t.result.status === "error" ? "rgba(181,50,65,.4)" : "rgba(231,184,78,.25)"}`,
                  borderRadius: "12px 12px 12px 4px",
                  padding: "12px 14px",
                  maxWidth: "85%",
                  fontSize: "13.5px",
                  color: "#f4f1ea",
                  lineHeight: 1.55,
                  whiteSpace: "pre-wrap",
                }}
              >
                {t.result.text}
                {t.result.toolCalls.length > 0 && (
                  <details style={{ marginTop: "10px" }}>
                    <summary
                      style={{
                        cursor: "pointer",
                        color: "#e7b84e",
                        fontSize: "11px",
                        fontWeight: 800,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      {t.result.toolCalls.length} tool {t.result.toolCalls.length === 1 ? "call" : "calls"}
                    </summary>
                    <pre
                      style={{
                        marginTop: "8px",
                        padding: "10px",
                        background: "#070b14",
                        borderRadius: "8px",
                        fontSize: "11px",
                        color: "#9aa3b8",
                        overflowX: "auto",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {JSON.stringify(t.result.toolCalls, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
          {pending && (
            <div style={{ color: "#9aa3b8", fontSize: "13px", fontStyle: "italic" }}>Thinking…</div>
          )}
        </div>

        <form onSubmit={onSubmit} style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tell the assistant what to do…"
            style={{
              flex: 1,
              padding: "14px 16px",
              border: "1.5px solid rgba(244,241,234,.14)",
              borderRadius: "12px",
              fontSize: "14.5px",
              color: "#f4f1ea",
              background: "#0b101c",
              outline: "none",
            }}
          />
          <button
            type="submit"
            disabled={pending || !input.trim()}
            style={{
              background: "#e7b84e",
              color: "#0b101c",
              fontWeight: 800,
              fontSize: "13px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "0 22px",
              borderRadius: "12px",
              border: "none",
              cursor: pending ? "wait" : "pointer",
              opacity: pending || !input.trim() ? 0.6 : 1,
            }}
          >
            Send
          </button>
        </form>
      </div>

      <aside>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "10px" }}>
          <div
            style={{
              fontSize: "10.5px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#9aa3b8",
            }}
          >
            Try these
          </div>
          {turns.length > 0 && (
            <button
              type="button"
              onClick={resetThread}
              style={{
                background: "transparent",
                border: "none",
                color: "#9aa3b8",
                fontSize: "10.5px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                padding: 0,
              }}
            >
              Clear
            </button>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {examples.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => send(ex)}
              disabled={pending}
              style={{
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "10px",
                padding: "10px 12px",
                cursor: pending ? "wait" : "pointer",
                color: "#cdd3e0",
                fontSize: "12.5px",
                textAlign: "left",
                lineHeight: 1.4,
              }}
            >
              {ex}
            </button>
          ))}
        </div>
      </aside>
    </div>
  );
}
