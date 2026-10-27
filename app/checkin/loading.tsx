import { PhoneShell } from "../../components/PhoneShell";
import { Skeleton, SkeletonBackBar } from "../../components/Skeleton";

export default function CheckinLoading() {
  return (
    <PhoneShell>
      <SkeletonBackBar />
      <div style={{ padding: "26px 20px", display: "flex", flexDirection: "column", gap: "18px" }}>
        <Skeleton width="75%" height={30} />
        <Skeleton width="95%" height={14} />
        <Skeleton width="60%" height={14} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginTop: "8px" }}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={56} radius={12} />
          ))}
        </div>
        <Skeleton height={64} radius={14} />
      </div>
    </PhoneShell>
  );
}
