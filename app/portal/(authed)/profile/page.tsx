import { requirePortalUser } from "../../../../lib/portal-auth";
import { ProfileForm } from "./ProfileForm";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const pu = await requirePortalUser();
  const initialName = pu.profile.full_name?.trim() ?? "";
  const roleLine =
    pu.role === "pastoral"
      ? "Pastoral leadership"
      : pu.role === "lead"
        ? `Ministry lead — ${pu.ministries.join(", ") || "no ministry assigned yet"}`
        : "Member";

  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "15px", fontWeight: 600, marginBottom: "6px" }}>
        Signed in as <span style={{ color: "#f4f1ea", fontWeight: 700 }}>{pu.email}</span>
      </p>
      <p style={{ color: "#e7b84e", fontSize: "12.5px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: "20px" }}>
        {roleLine}
      </p>
      <ProfileForm initialName={initialName} />
    </div>
  );
}
