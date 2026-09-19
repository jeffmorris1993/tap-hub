import { Skeleton, SkeletonList } from "../../../../components/Skeleton";

export default function AdminAnnouncementsLoading() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "16px",
          gap: "12px",
        }}
      >
        <Skeleton width="45%" height={16} />
        <div style={{ display: "flex", gap: "10px" }}>
          <Skeleton width={160} height={40} radius={10} />
        </div>
      </div>
      <SkeletonList rows={8} />
    </div>
  );
}
