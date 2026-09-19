import { ResetConfirmForm } from "./ResetConfirmForm";

export const dynamic = "force-dynamic";

export default function PortalResetConfirm() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "32px 20px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "420px",
          background: "#0b101c",
          border: "1px solid rgba(244,241,234,.08)",
          borderRadius: "20px",
          padding: "32px 28px",
        }}
      >
        <div
          style={{
            fontSize: "10px",
            fontWeight: 800,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "#e7b84e",
            marginBottom: "8px",
          }}
        >
          Neh Temple · Member Portal
        </div>
        <h1
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "30px",
            lineHeight: 1,
            marginBottom: "14px",
          }}
        >
          Choose a new password
        </h1>
        <ResetConfirmForm />
      </div>
    </div>
  );
}
