/**
 * "Continue with Google", as its own <form method="post">.
 *
 * It must be a sibling of the email form, never nested inside it — nested
 * forms are invalid HTML and the inner one is dropped by the parser. POST
 * rather than a link so the browser can't prefetch it and spend the
 * single-use PKCE verifier. No client JS: it works before hydration.
 */

/** Google's four-colour mark, inline so there's no external asset to fetch. */
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true" focusable="false">
      <path
        fill="#4285F4"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92c1.7-1.57 2.68-3.88 2.68-6.62Z"
      />
      <path
        fill="#34A853"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.03-3.7H.96v2.33A9 9 0 0 0 9 18Z"
      />
      <path
        fill="#FBBC05"
        d="M3.97 10.72a5.4 5.4 0 0 1 0-3.44V4.95H.96a9 9 0 0 0 0 8.1l3.01-2.33Z"
      />
      <path
        fill="#EA4335"
        d="M9 3.58c1.32 0 2.5.45 3.44 1.35l2.58-2.59C13.46.9 11.43 0 9 0A9 9 0 0 0 .96 4.95l3.01 2.33C4.68 5.16 6.66 3.58 9 3.58Z"
      />
    </svg>
  );
}

export function GoogleSignInButton({ next, label }: { next: string; label: string }) {
  return (
    <>
      <form method="post" action="/auth/signin/google">
        <input type="hidden" name="next" value={next} />
        <button
          type="submit"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "10px",
            background: "transparent",
            color: "#f4f1ea",
            fontWeight: 700,
            fontSize: "14.5px",
            padding: "15px 16px",
            borderRadius: "12px",
            border: "1.5px solid rgba(244,241,234,.22)",
            cursor: "pointer",
          }}
        >
          <GoogleMark />
          {label}
        </button>
      </form>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          margin: "18px 0",
          color: "#9aa3b8",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.14em",
          textTransform: "uppercase",
        }}
      >
        <span style={{ flex: 1, height: "1px", background: "rgba(244,241,234,.1)" }} />
        or
        <span style={{ flex: 1, height: "1px", background: "rgba(244,241,234,.1)" }} />
      </div>
    </>
  );
}
