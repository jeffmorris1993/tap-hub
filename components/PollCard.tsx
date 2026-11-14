"use client";

import { useEffect, useState, useTransition } from "react";
import {
  getPollState,
  votePoll,
  type PollState,
  type PollStateResult,
} from "../app/announcements/[id]/poll-actions";

/**
 * The voting block on a poll announcement's detail page. A client island so
 * the page itself stays ISR: poll state (which depends on the viewer's vote
 * cookie) is fetched through a server action on mount.
 */

const GOLD = "#e7b84e";

function closesLabel(iso: string | null): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PollCard({ announcementId }: { announcementId: string }) {
  const [state, setState] = useState<PollState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;
    getPollState(announcementId).then((r: PollStateResult) => {
      if (cancelled) return;
      if (r.ok) setState(r);
      else setError(r.error);
    });
    return () => {
      cancelled = true;
    };
  }, [announcementId]);

  function onVote(optionId: string) {
    if (!state?.open || state.votedOptionId || pending) return;
    startTransition(async () => {
      const r = await votePoll(announcementId, optionId);
      if (r.ok) {
        setState(r);
        setError(null);
      } else {
        setError(r.error);
      }
    });
  }

  if (error && !state) {
    return (
      <div style={{ marginTop: "18px", color: "#9aa3b8", fontSize: "13px", fontWeight: 600 }}>
        {error}
      </div>
    );
  }

  if (!state) {
    // Skeleton rows while the state loads.
    return (
      <div style={{ marginTop: "18px", display: "grid", gap: "9px" }} aria-busy>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              height: "48px",
              borderRadius: "12px",
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.06)",
              opacity: 0.6 - i * 0.12,
            }}
          />
        ))}
      </div>
    );
  }

  const reveal = state.closed || state.votedOptionId !== null;
  const total = state.total ?? 0;
  const topCount = reveal ? Math.max(0, ...state.options.map((o) => o.count ?? 0)) : 0;

  return (
    <div style={{ marginTop: "18px" }}>
      {/* status line */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "7px",
          fontSize: "10.5px",
          fontWeight: 800,
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          color: state.closed ? "#9aa3b8" : "#7ed996",
          marginBottom: "12px",
        }}
      >
        <span
          style={{
            width: "7px",
            height: "7px",
            borderRadius: "50%",
            background: state.closed ? "#6a738b" : "#4eb86b",
          }}
        />
        {state.closed
          ? `Poll closed${state.closesAt ? ` · ${closesLabel(state.closesAt)}` : ""}`
          : `Poll open · closes ${closesLabel(state.closesAt)}`}
      </div>

      {!reveal ? (
        <>
          <div style={{ display: "grid", gap: "9px" }}>
            {state.options.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => onVote(o.id)}
                disabled={pending || !state.open}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                  textAlign: "left",
                  background: "#121a2e",
                  border: "1.5px solid rgba(244,241,234,.14)",
                  borderRadius: "12px",
                  padding: "14px 16px",
                  color: "#f4f1ea",
                  fontSize: "15px",
                  fontWeight: 700,
                  cursor: pending ? "wait" : "pointer",
                  opacity: pending ? 0.7 : 1,
                }}
              >
                <span
                  style={{
                    width: "18px",
                    height: "18px",
                    borderRadius: "50%",
                    border: "2px solid rgba(244,241,234,.3)",
                    flexShrink: 0,
                  }}
                />
                {o.label}
              </button>
            ))}
          </div>
          <p style={{ marginTop: "12px", color: "#9aa3b8", fontSize: "12px", fontWeight: 600 }}>
            🗳️ Tap your favorite to cast your vote · one vote per device
          </p>
          {error && (
            <p style={{ marginTop: "8px", color: "#ff8a8a", fontSize: "12.5px", fontWeight: 700 }}>
              {error}
            </p>
          )}
        </>
      ) : (
        <>
          <div style={{ display: "grid", gap: "13px" }}>
            {state.options.map((o) => {
              const count = o.count ?? 0;
              const share = total === 0 ? 0 : Math.round((count / total) * 100);
              const leading = total > 0 && count === topCount;
              const mine = state.votedOptionId === o.id;
              return (
                <div key={o.id}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "baseline",
                      justifyContent: "space-between",
                      gap: "10px",
                      marginBottom: "6px",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "14px",
                        fontWeight: 700,
                        color: leading ? GOLD : "#f4f1ea",
                      }}
                    >
                      {state.closed && leading && total > 0 ? "🏆 " : ""}
                      {o.label}
                      {mine && (
                        <span style={{ color: "#9aa3b8", fontWeight: 600, fontSize: "11.5px" }}>
                          {" "}
                          · your vote
                        </span>
                      )}
                    </span>
                    <span
                      style={{
                        fontSize: "12.5px",
                        fontWeight: 800,
                        color: leading ? GOLD : "#9aa3b8",
                        fontVariantNumeric: "tabular-nums",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {share}% · {count}
                    </span>
                  </div>
                  <div
                    style={{
                      height: "9px",
                      borderRadius: "999px",
                      background: "#121a2e",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${share}%`,
                        height: "100%",
                        borderRadius: "999px",
                        background: leading
                          ? `linear-gradient(90deg, #b78b22, ${GOLD})`
                          : "#3d4e77",
                        transition: "width .5s ease",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <p style={{ marginTop: "14px", color: "#9aa3b8", fontSize: "12px", fontWeight: 600 }}>
            {state.closed
              ? total === 0
                ? "No votes were cast."
                : `${total} ${total === 1 ? "vote" : "votes"} · thanks for taking part! 🎉`
              : `✓ Vote recorded — ${total} ${total === 1 ? "vote" : "votes"} so far. Results update live.`}
          </p>
        </>
      )}
    </div>
  );
}
