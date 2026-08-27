import { Skeleton, SkeletonList } from "../../../../components/Skeleton";

export default function AgentLogLoading() {
  return (
    <div>
      <Skeleton width={180} height={32} style={{ marginBottom: 22 }} />
      <SkeletonList rows={6} rowHeight={110} />
    </div>
  );
}
