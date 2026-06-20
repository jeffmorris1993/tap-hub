import { supabaseAdmin } from "../../../../lib/supabase/server";
import { fmtDateTime as fmtDate } from "../../../../lib/format";

export const dynamic = "force-dynamic";

export default async function AgentLog() {
  const { data } = await supabaseAdmin()
    .from("agent_runs")
    .select("id, channel, sender, input, tool_calls, output, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);

  const rows = data ?? [];

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
        Agent Log
      </h1>
      <p style={{ color: "#9aa3b8", fontSize: "14px", marginBottom: "24px" }}>
        Last 100 agent runs across every channel.
      </p>

      {rows.length === 0 ? (
        <div style={{ color: "#9aa3b8", fontSize: "14px" }}>No runs yet.</div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {rows.map((r) => (
            <div
              key={r.id as string}
              style={{
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "12px",
                padding: "16px 18px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "10px",
                  flexWrap: "wrap",
                  marginBottom: "10px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                  <span
                    style={{
                      background:
                        r.status === "ok"
                          ? "rgba(78,184,107,.15)"
                          : r.status === "blocked"
                            ? "rgba(231,184,78,.15)"
                            : "rgba(181,50,65,.15)",
                      color:
                        r.status === "ok" ? "#7ed996" : r.status === "blocked" ? "#e7b84e" : "#ff8a8a",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: "5px",
                    }}
                  >
                    {String(r.status)}
                  </span>
                  <span
                    style={{
                      background: "rgba(78,141,231,.15)",
                      color: "#7eaef0",
                      fontSize: "10.5px",
                      fontWeight: 800,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                      padding: "3px 8px",
                      borderRadius: "5px",
                    }}
                  >
                    {String(r.channel)}
                  </span>
                  <span style={{ color: "#cdd3e0", fontSize: "12.5px" }}>{String(r.sender)}</span>
                </div>
                <div style={{ color: "#9aa3b8", fontSize: "12.5px" }}>{fmtDate(String(r.created_at))}</div>
              </div>
              <div style={{ fontSize: "13.5px", color: "#f4f1ea", marginBottom: "8px" }}>
                <strong style={{ color: "#9aa3b8", fontWeight: 700 }}>In:</strong> {String(r.input)}
              </div>
              <div style={{ fontSize: "13px", color: "#cdd3e0", whiteSpace: "pre-wrap" }}>
                <strong style={{ color: "#9aa3b8", fontWeight: 700 }}>Out:</strong> {String(r.output)}
              </div>
              {Array.isArray(r.tool_calls) && r.tool_calls.length > 0 && (
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
                    {r.tool_calls.length} tool {r.tool_calls.length === 1 ? "call" : "calls"}
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
                    {JSON.stringify(r.tool_calls, null, 2)}
                  </pre>
                </details>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
