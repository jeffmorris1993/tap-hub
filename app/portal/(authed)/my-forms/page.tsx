import Link from "next/link";
import { requirePortalUser } from "../../../../lib/portal-auth";
import { listMyForms } from "../../../../lib/supabase/admin-queries";
import { fmtDateTime } from "../../../../lib/format";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<string, string> = {
  prayer: "🙏",
  feedback: "💬",
  visitor: "👋",
};

export default async function MyForms() {
  const pu = await requirePortalUser();
  const forms = await listMyForms(pu.user.id, pu.email);

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 600, marginBottom: "18px" }}>
        Everything you&apos;ve submitted through the Tap Hub.
      </p>

      {forms.length === 0 ? (
        <div
          style={{
            color: "#6a738b",
            fontSize: "14px",
            fontWeight: 600,
            background: "#121a2e",
            border: "1px solid rgba(244,241,234,.08)",
            borderRadius: "16px",
            padding: "32px",
            textAlign: "center",
          }}
        >
          Nothing here yet. Prayer requests and feedback you submit while signed in show up here —{" "}
          <Link href="/feedback" style={{ color: "#e7b84e", textDecoration: "none", fontWeight: 800 }}>
            share something
          </Link>
          .
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {forms.map((f, i) => (
            <div
              key={`${f.kind}-${f.created_at}-${i}`}
              style={{
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "14px",
                padding: "17px",
                display: "flex",
                alignItems: "center",
                gap: "15px",
              }}
            >
              <span
                style={{
                  width: "44px",
                  height: "44px",
                  borderRadius: "11px",
                  background: "#1a2438",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  fontSize: "18px",
                }}
              >
                {KIND_LABEL[f.kind] ?? "📄"}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: "14.5px", color: "#f4f1ea" }}>{f.title}</div>
                <div
                  style={{
                    fontSize: "12.5px",
                    color: "#9aa3b8",
                    fontWeight: 600,
                    marginTop: "2px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {f.meta}
                </div>
              </div>
              <span style={{ color: "#6a738b", fontSize: "11.5px", whiteSpace: "nowrap", fontWeight: 600 }}>
                {fmtDateTime(f.created_at)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
