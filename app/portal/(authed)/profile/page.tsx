import { requirePortalUser } from "../../../../lib/portal-auth";
import { ProfileForm } from "./ProfileForm";
import { CustomizeMenuButton } from "./CustomizeMenuButton";

export const dynamic = "force-dynamic";

function initialsFrom(name: string, email: string): string {
  const source = name.trim() || (email.split("@")[0] ?? email);
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

function fmtPhone(digits: string): string {
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits.startsWith("1")) {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return digits;
}

const card: React.CSSProperties = {
  background: "#121a2e",
  border: "1px solid rgba(244,241,234,.08)",
  borderRadius: "18px",
  padding: "24px",
};

export default async function ProfilePage() {
  const pu = await requirePortalUser();
  const initialName = pu.profile.full_name?.trim() ?? "";
  const displayName = initialName || pu.email;
  const roleLine =
    pu.role === "pastoral"
      ? "Pastoral leadership"
      : pu.role === "lead"
        ? `Ministry lead — ${pu.ministries.join(", ") || "no ministry assigned yet"}`
        : "Member";
  const since = pu.profile.created_at
    ? new Date(pu.profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : null;
  const phone = pu.profile.phone ? fmtPhone(pu.profile.phone) : null;

  return (
    <div className="p-card-grid" style={{ gap: "16px", alignItems: "start" }}>
      <div style={{ ...card, textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px" }}>
        <span
          style={{
            width: "88px",
            height: "88px",
            borderRadius: "50%",
            background: "#e7b84e",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-anton)",
            fontSize: "32px",
            color: "#0b101c",
          }}
        >
          {initialsFrom(initialName, pu.email)}
        </span>
        <h2
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            color: "#f4f1ea",
            fontSize: "24px",
            lineHeight: 1.1,
            marginTop: "6px",
            overflowWrap: "anywhere",
          }}
        >
          {displayName}
        </h2>
        <span
          style={{
            fontSize: "12.5px",
            fontWeight: 800,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "#e7b84e",
            background: "rgba(231,184,78,.13)",
            padding: "5px 11px",
            borderRadius: "7px",
          }}
        >
          {roleLine}
        </span>
        <p
          style={{
            fontSize: "14.5px",
            color: "#9aa3b8",
            fontWeight: 600,
            lineHeight: 1.7,
            marginTop: "6px",
            overflowWrap: "anywhere",
          }}
        >
          {pu.email}
          {phone && (
            <>
              <br />
              {phone}
            </>
          )}
          {since && (
            <>
              <br />
              Member since {since}
            </>
          )}
        </p>
        <CustomizeMenuButton />
      </div>

      <ProfileForm initialName={initialName} initialPhone={pu.profile.phone ?? ""} />
    </div>
  );
}
