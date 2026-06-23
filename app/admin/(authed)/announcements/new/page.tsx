import { AnnouncementForm } from "../AnnouncementForm";

export const dynamic = "force-dynamic";

export default function NewAnnouncement() {
  return (
    <div>
      <p style={{ color: "#9aa3b8", fontSize: "14px", fontWeight: 600, marginBottom: "20px" }}>
        Create a new announcement. It&apos;ll appear on the public Announcements
        tab as soon as it&apos;s saved with <em>Published</em> on.
      </p>
      <AnnouncementForm />
    </div>
  );
}
