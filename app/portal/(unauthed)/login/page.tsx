import Link from "next/link";
import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function PortalLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; sent?: string; error?: string }>;
}) {
  const params = await searchParams;
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
          Welcome back
        </h1>
        <p style={{ color: "#9aa3b8", fontSize: "14px", lineHeight: 1.5, marginBottom: "22px" }}>
          Sign in to your dashboard. Staff sign in with their{" "}
          <strong style={{ color: "#cdd3e0" }}>@nehtemple.org</strong> email.
        </p>

        <LoginForm next={params.next ?? "/portal"} />

        {params.sent === "1" && (
          <div
            style={{
              marginTop: "18px",
              padding: "12px 14px",
              borderRadius: "11px",
              background: "rgba(231,184,78,.08)",
              border: "1px solid rgba(231,184,78,.25)",
              fontSize: "13.5px",
              fontWeight: 600,
              color: "#cdd3e0",
              lineHeight: 1.5,
            }}
          >
            Magic link sent. Check your inbox and click the link to sign in.
          </div>
        )}
        {params.error && (
          <div
            style={{
              marginTop: "18px",
              padding: "12px 14px",
              borderRadius: "11px",
              background: "rgba(181,50,65,.12)",
              border: "1px solid rgba(181,50,65,.4)",
              fontSize: "13.5px",
              fontWeight: 600,
              color: "#ffb1b1",
            }}
          >
            {errorMessage(params.error)}
          </div>
        )}

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
          New to Neh Temple?{" "}
          <Link href="/portal/signup" style={{ color: "#e7b84e", textDecoration: "none", fontWeight: 800 }}>
            Create a free account
          </Link>
        </div>
      </div>
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "expired":
      return "That link expired. Sign in again or request a new one.";
    case "config":
      return "Auth isn't configured on the server. Contact the admin.";
    default:
      return "Sign-in failed. Try again.";
  }
}
