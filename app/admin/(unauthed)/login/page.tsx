import { LoginForm } from "./LoginForm";

export const dynamic = "force-dynamic";

export default async function AdminLogin({
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
          TapHub Admin
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
          Sign in
        </h1>
        <p style={{ color: "#9aa3b8", fontSize: "14px", lineHeight: 1.5, marginBottom: "22px" }}>
          Use your <strong style={{ color: "#cdd3e0" }}>@nehtemple.org</strong> email. We&apos;ll send you a magic
          link.
        </p>

        <LoginForm next={params.next ?? "/admin"} />

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
      </div>
    </div>
  );
}

function errorMessage(code: string): string {
  switch (code) {
    case "domain":
      return "That email isn't on the admin allowlist. Use your @nehtemple.org address.";
    case "expired":
      return "That magic link expired. Request a new one below.";
    case "config":
      return "Auth isn't configured on the server. Contact the admin.";
    default:
      return "Sign-in failed. Try again or request a new link.";
  }
}
