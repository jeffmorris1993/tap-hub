"use client";

export function SignOutButton() {
  function onClick() {
    const form = document.createElement("form");
    form.method = "POST";
    form.action = "/auth/sign-out";
    document.body.appendChild(form);
    form.submit();
  }
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        background: "#1a2438",
        color: "#cdd3e0",
        border: "1px solid rgba(244,241,234,.14)",
        fontWeight: 700,
        fontSize: "12px",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        padding: "8px 14px",
        borderRadius: "8px",
        cursor: "pointer",
      }}
    >
      Sign out
    </button>
  );
}
