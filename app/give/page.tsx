"use client";

import { useState } from "react";
import { PhoneShell } from "../../components/PhoneShell";
import { BackBar } from "../../components/BackBar";

const PRESETS = ["25", "50", "100", "250", "500"];
const FUNDS = ["Tithes & Offerings", "Building Fund", "Missions & Outreach", "Youth Ministry"];
const FREQUENCIES = ["One-time", "Weekly", "Monthly"];

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "11.5px",
  fontWeight: 800,
  letterSpacing: "0.07em",
  textTransform: "uppercase",
  color: "#cdd3e0",
};

function segOn(on: boolean): React.CSSProperties {
  return {
    background: on ? "#e7b84e" : "#121a2e",
    color: on ? "#0b101c" : "#cdd3e0",
    border: `1.5px solid ${on ? "#e7b84e" : "rgba(244,241,234,.12)"}`,
  };
}

export default function Give() {
  const [amount, setAmount] = useState<string>("50");
  const [custom, setCustom] = useState<string>("");
  const [fund, setFund] = useState<string>(FUNDS[0]);
  const [freq, setFreq] = useState<string>(FREQUENCIES[0]);

  const giveUrl = process.env.NEXT_PUBLIC_EXTERNAL_GIVE_URL ?? "";
  const isCustom = amount === "custom";
  const amtVal = isCustom ? custom || "0" : amount;
  const giveBtnAmount = `$${amtVal}`;

  function handleSubmit() {
    if (!giveUrl) return;
    window.open(giveUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <PhoneShell>
      <div className="th-slide" style={{ minHeight: "100vh" }}>
        <BackBar title="Give" subtitle="Secure online giving" />

        <div style={{ padding: "20px 18px 40px" }}>
          <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 500, lineHeight: 1.55, marginBottom: "22px" }}>
            Your generosity fuels worship, outreach, and the next generation here in Madison Heights and beyond.
          </p>

          <label style={{ ...labelStyle, marginBottom: "11px" }}>Amount</label>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "10px", marginBottom: "12px" }}>
            {PRESETS.map((v) => (
              <button
                key={v}
                type="button"
                onClick={() => setAmount(v)}
                style={{
                  fontFamily: "var(--font-anton)",
                  fontSize: "18px",
                  padding: "16px 4px",
                  borderRadius: "12px",
                  cursor: "pointer",
                  ...segOn(amount === v),
                }}
              >
                ${v}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setAmount("custom")}
              style={{
                fontFamily: "var(--font-anton)",
                fontSize: "15px",
                padding: "16px 4px",
                borderRadius: "12px",
                cursor: "pointer",
                ...segOn(isCustom),
              }}
            >
              Other
            </button>
          </div>
          {isCustom && (
            <div style={{ position: "relative", marginBottom: "22px" }}>
              <span
                style={{
                  position: "absolute",
                  left: "16px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  fontFamily: "var(--font-anton)",
                  fontSize: "18px",
                  color: "#e7b84e",
                }}
              >
                $
              </span>
              <input
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                type="number"
                inputMode="decimal"
                placeholder="Enter amount"
                style={{
                  width: "100%",
                  padding: "14px 15px 14px 32px",
                  border: "1.5px solid rgba(231,184,78,.4)",
                  borderRadius: "11px",
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "#f4f1ea",
                  background: "#0b101c",
                  outline: "none",
                }}
              />
            </div>
          )}

          <label style={{ ...labelStyle, margin: "10px 0 8px" }}>Give To</label>
          <select
            value={fund}
            onChange={(e) => setFund(e.target.value)}
            style={{
              width: "100%",
              padding: "14px 15px",
              border: "1.5px solid rgba(244,241,234,.14)",
              borderRadius: "11px",
              fontSize: "15px",
              fontWeight: 600,
              color: "#f4f1ea",
              background: "#0b101c",
              outline: "none",
              marginBottom: "18px",
              WebkitAppearance: "none",
              appearance: "none",
            }}
          >
            {FUNDS.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>

          <label style={{ ...labelStyle, marginBottom: "10px" }}>Frequency</label>
          <div style={{ display: "flex", gap: "10px", marginBottom: "26px" }}>
            {FREQUENCIES.map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFreq(f)}
                style={{
                  flex: 1,
                  fontWeight: 800,
                  fontSize: "13.5px",
                  padding: "14px",
                  borderRadius: "11px",
                  cursor: "pointer",
                  ...segOn(freq === f),
                }}
              >
                {f}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!giveUrl}
            style={{
              width: "100%",
              background: "#e7b84e",
              color: "#0b101c",
              fontWeight: 800,
              fontSize: "15px",
              letterSpacing: "0.05em",
              textTransform: "uppercase",
              padding: "18px",
              borderRadius: "12px",
              border: "none",
              cursor: giveUrl ? "pointer" : "not-allowed",
              boxShadow: "0 12px 30px -10px rgba(231,184,78,.5)",
              opacity: giveUrl ? 1 : 0.6,
            }}
          >
            Give {giveBtnAmount}
          </button>
          {!giveUrl && (
            <div style={{ color: "#9aa3b8", fontSize: "12px", fontWeight: 600, marginTop: "10px", textAlign: "center" }}>
              Givelify link not configured. Set <code>NEXT_PUBLIC_EXTERNAL_GIVE_URL</code> in <code>.env.local</code>.
            </div>
          )}
          <div
            style={{
              marginTop: "14px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "7px",
              color: "#6a738b",
              fontSize: "12px",
              fontWeight: 700,
            }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="4" y="10" width="16" height="10" rx="2" />
              <path d="M8 10V7a4 4 0 018 0v3" />
            </svg>
            Secure · also text GIVE to (248) 555-1234
          </div>
        </div>
      </div>
    </PhoneShell>
  );
}
