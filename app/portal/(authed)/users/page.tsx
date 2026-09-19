import { requirePastoral, type PortalRole } from "../../../../lib/portal-auth";
import { isAllowedAdminEmail } from "../../../../lib/supabase/auth";
import { supabaseAdmin } from "../../../../lib/supabase/server";
import { UsersList, type UserRow } from "./UsersList";

export const dynamic = "force-dynamic";

export default async function UsersPage() {
  await requirePastoral();

  const { data, error } = await supabaseAdmin()
    .from("profiles")
    .select("id, email, full_name, role, ministries, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;

  const users: UserRow[] = ((data ?? []) as Array<{
    id: string;
    email: string;
    full_name: string | null;
    role: PortalRole;
    ministries: string[];
    created_at: string;
  }>).map((u) => ({ ...u, isStaffEligible: isAllowedAdminEmail(u.email) }));

  const staff = users.filter((u) => u.role !== "member");
  const members = users.filter((u) => u.role === "member");

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "14.5px", fontWeight: 600, marginBottom: "22px" }}>
        Everyone with a portal account. Members can use any email; lead and pastoral roles
        require an <strong style={{ color: "#cdd3e0" }}>@nehtemple.org</strong> address.
      </p>

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
          <UsersList users={staff} />
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
        <UsersList users={members} />
      )}
    </div>
  );
}
