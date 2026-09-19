import { Skeleton, SkeletonList } from "../../../../components/Skeleton";

export default function AdminSubmissionsLoading() {
  return (
    <div>
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} width={104} height={40} radius={10} />
        ))}
      </div>
      <SkeletonList rows={10} />
    </div>
  );
}
