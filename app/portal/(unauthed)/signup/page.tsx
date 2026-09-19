import Link from "next/link";
import { SignupForm } from "./SignupForm";

export const dynamic = "force-dynamic";

export default function PortalSignup() {
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
          Create your account
        </h1>
        <p style={{ color: "#9aa3b8", fontSize: "14px", lineHeight: 1.5, marginBottom: "22px" }}>
          See your event signups, forms, and profile in one place. Any email works.
        </p>

        <SignupForm />

        <div
          style={{
            marginTop: "22px",
            paddingTop: "18px",
            borderTop: "1px solid rgba(244,241,234,.08)",
            fontSize: "13.5px",
            fontWeight: 600,
            color: "#9aa3b8",
            textAlign: "center",
          }}
        >
          Already have an account?{" "}
          <Link href="/portal/login" style={{ color: "#e7b84e", textDecoration: "none", fontWeight: 800 }}>
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
