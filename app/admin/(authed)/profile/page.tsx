import { redirect } from "next/navigation";
import { getAdminUser } from "../../../../lib/supabase/auth";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const initialName =
    (user.user_metadata?.full_name as string | undefined)?.trim() ?? "";

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 600, marginBottom: "20px" }}>
        Signed in as <span style={{ color: "#f4f1ea", fontWeight: 700 }}>{user.email}</span>
      </p>
      <ProfileForm initialName={initialName} />
    </div>
  );
}
