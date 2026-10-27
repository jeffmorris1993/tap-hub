import { Skeleton, SkeletonList } from "../../../../components/Skeleton";

export default function AttendanceLoading() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <Skeleton width="60%" height={14} />
      <div style={{ display: "flex", gap: "8px" }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} width={110} height={40} radius={12} />
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "12px" }}>
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} height={96} radius={16} />
        ))}
      </div>
      <SkeletonList rows={4} />
    </div>
  );
}
