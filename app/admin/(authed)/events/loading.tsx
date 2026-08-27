import { Skeleton, SkeletonList } from "../../../../components/Skeleton";

export default function AdminEventsLoading() {
  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-end",
          marginBottom: "22px",
          gap: "12px",
        }}
      >
        <Skeleton width={140} height={32} />
        <div style={{ display: "flex", gap: "10px" }}>
          <Skeleton width={120} height={42} radius={10} />
          <Skeleton width={130} height={42} radius={10} />
        </div>
      </div>
      <SkeletonList rows={8} />
    </div>
  );
}
