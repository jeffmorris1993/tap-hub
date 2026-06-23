import { AnnouncementForm } from "../AnnouncementForm";
import { currentUserCanApprove } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewAnnouncement() {
  const canApprove = await currentUserCanApprove();
  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "14px", fontWeight: 600, marginBottom: "20px" }}>
        Create a new announcement.{" "}
        {canApprove
          ? "Save as a draft, or hit Publish to put it live immediately."
          : "Save as a draft, then submit it for the Bishop or Assistant Pastor to review."}
      </p>
      <AnnouncementForm canApprove={canApprove} />
    </div>
  );
}
