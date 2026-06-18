"use client";

import { useEffect, useState, useCallback } from "react";

type Card = { id: number; color: string; flipped: boolean; matched: boolean };

const COLORS = ["#e7b84e", "#b53241", "#4e8de7", "#4eb86b"];

function makeDeck(): Card[] {
  const deck = [...COLORS, ...COLORS].map((c, i) => ({
    id: i,
    color: c,
    flipped: false,
    matched: false,
  }));
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

export function MemoryMatch() {
  const [cards, setCards] = useState<Card[]>([]);
  const [first, setFirst] = useState<number | null>(null);
  const [lock, setLock] = useState(false);
  const [moves, setMoves] = useState(0);
  const [matched, setMatched] = useState(0);

  const reset = useCallback(() => {
    setCards(makeDeck());
    setFirst(null);
    setLock(false);
    setMoves(0);
    setMatched(0);
  }, []);

  useEffect(() => {
    reset();
  }, [reset]);

  const won = matched === COLORS.length;

  function flip(i: number) {
    if (lock || won) return;
    const c = cards[i];
    if (!c || c.flipped || c.matched) return;
    const next = cards.map((x, j) => (j === i ? { ...x, flipped: true } : x));

    if (first === null) {
      setCards(next);
      setFirst(i);
      return;
    }

    const a = next[first];
    const b = next[i];
    if (a.color === b.color) {
      setCards(next.map((x) => (x.color === a.color ? { ...x, matched: true } : x)));
      setFirst(null);
      setMoves((m) => m + 1);
      setMatched((m) => m + 1);
    } else {
      setCards(next);
      setFirst(null);
      setLock(true);
      setMoves((m) => m + 1);
      setTimeout(() => {
        setCards((cur) => cur.map((x) => (x.matched ? x : { ...x, flipped: false })));
        setLock(false);
      }, 750);
    }
  }

  return (
    <div
      style={{
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "18px",
        padding: "18px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "14px",
        }}
      >
        <div>
          <div
            style={{
              fontFamily: "var(--font-anton)",
              fontWeight: 400,
              textTransform: "uppercase",
              fontSize: "19px",
              lineHeight: 1,
            }}
          >
            Memory Match
          </div>
          <div style={{ fontSize: "12px", color: "#9aa3b8", fontWeight: 600, marginTop: "3px" }}>
            Moves: {moves} · Pairs: {matched}/{COLORS.length}
          </div>
        </div>
        <button
          type="button"
          onClick={reset}
          style={{
            background: "#1a2438",
            color: "#e7b84e",
            border: "1px solid rgba(231,184,78,.3)",
            fontWeight: 800,
            fontSize: "11.5px",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            padding: "10px 16px",
            borderRadius: "10px",
            cursor: "pointer",
          }}
        >
          New Game
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: "8px" }}>
        {cards.map((c, i) => {
          const show = c.flipped || c.matched;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => flip(i)}
              style={{
                aspectRatio: "1",
                borderRadius: "12px",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1.5px solid ${show ? "rgba(244,241,234,.14)" : "rgba(244,241,234,.1)"}`,
                background: show ? "#0b101c" : "linear-gradient(135deg,#1f2b46,#16203a)",
                transition: "background .2s",
                opacity: c.matched ? 0.55 : 1,
              }}
            >
              <span
                style={{
                  width: "60%",
                  height: "60%",
                  borderRadius: "50%",
                  background: show ? c.color : "transparent",
                  boxShadow: show ? `0 4px 14px ${c.color}66` : "none",
                }}
              />
            </button>
          );
        })}
      </div>
      {won && (
        <div
          style={{
            marginTop: "14px",
            textAlign: "center",
            background: "rgba(231,184,78,.12)",
            borderRadius: "12px",
            padding: "13px",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-anton)",
              fontSize: "17px",
              color: "#e7b84e",
              textTransform: "uppercase",
            }}
          >
            You did it! 🎉 {moves} moves
          </span>
        </div>
      )}
    </div>
  );
}
