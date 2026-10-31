import { requirePastoral, type PortalRole } from "../../../../lib/portal-auth";
import { isAllowedAdminEmail } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { UsersList, type UserRow } from "./UsersList";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  const pu = await requirePastoral();

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, full_name, role, ministries, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const rows = (data ?? []) as Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: PortalRole;
    ministries: string[];
    created_at: string;
  }>;

  // Two accounts under one name almost always means a mistyped signup email —
  // the confirmation never arrived, so they signed up again. Surface it here
  // rather than waiting for someone to notice.
  const nameCounts = new Map<string, number>();
  for (const u of rows) {
    const key = (u.full_name ?? "").trim().toLowerCase().replace(/\s+/g, " ");
    if (!key) continue;
    nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const nameKey = (u: { full_name: string | null }) =>
    (u.full_name ?? "").trim().toLowerCase().replace(/\s+/g, " ");

  const users: UserRow[] = rows.map((u) => ({
    ...u,
    isStaffEligible: isAllowedAdminEmail(u.email),
    sharesName: (nameCounts.get(nameKey(u)) ?? 0) > 1,
  }));

  const duplicates = users
    .filter((u) => u.sharesName)
    .reduce<Map<string, UserRow[]>>((acc, u) => {
      const key = nameKey(u);
      acc.set(key, [...(acc.get(key) ?? []), u]);
      return acc;
    }, new Map());

  const staff = users.filter((u) => u.role !== "member");
  const members = users.filter((u) => u.role === "member");

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 600, marginBottom: "22px" }}>
        Everyone with a portal account. Members can use any email; lead and pastoral roles
        require an <strong style={{ color: "#cdd3e0" }}>@nehtemple.org</strong> address.
      </p>

      {duplicates.size > 0 && (
        <div
          style={{
            background: "rgba(231,184,78,.08)",
            border: "1px solid rgba(231,184,78,.3)",
            borderRadius: "14px",
            padding: "16px 18px",
            marginBottom: "22px",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
          }}
        >
          <div
            style={{
              fontSize: "11px",
              fontWeight: 800,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "#e7b84e",
            }}
          >
            Possible duplicate accounts
          </div>
          <p style={{ fontSize: "13.5px", color: "#cdd3e0", fontWeight: 600, lineHeight: 1.55 }}>
            More than one account shares a name. This usually means a mistyped email — the
            confirmation never arrived, so they signed up again. Open the right one, choose
            Change role, then Remove account.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
            {[...duplicates.values()].map((group) => (
              <div key={group[0].id} style={{ fontSize: "13px", lineHeight: 1.6 }}>
                <strong style={{ color: "#f4f1ea" }}>
                  {group[0].full_name?.trim() || "Unnamed"}
                </strong>
                <span style={{ color: "#9aa3b8", fontWeight: 600 }}>
                  {" — "}
                  {group.map((u) => u.email).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <h2
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "19px",
          color: "#f4f1ea",
          marginBottom: "12px",
        }}
      >
        Staff
      </h2>
      {staff.length === 0 ? (
        <div style={{ color: "#6a738b", fontSize: "13.5px", fontWeight: 600, marginBottom: "26px" }}>
          No lead or pastoral roles assigned yet. (Emails on the approver env list act as
          pastoral until roles are set here.)
        </div>
      ) : (
        <div style={{ marginBottom: "26px" }}>
          <UsersList users={staff} currentEmail={pu.email} />
        </div>
      )}

      <h2
        style={{
          fontFamily: "var(--font-anton)",
          fontWeight: 400,
          textTransform: "uppercase",
          fontSize: "19px",
          color: "#f4f1ea",
          marginBottom: "12px",
        }}
      >
        Members
      </h2>
      {members.length === 0 ? (
        <div style={{ color: "#6a738b", fontSize: "13.5px", fontWeight: 600 }}>
          No member accounts yet.
        </div>
      ) : (
        <UsersList users={members} currentEmail={pu.email} />
      )}
    </div>
  );
}
