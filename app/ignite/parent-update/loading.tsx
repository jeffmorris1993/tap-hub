import { PhoneShell } from "../../../components/PhoneShell";
import { Skeleton, SkeletonBackBar } from "../../../components/Skeleton";

export default function Loading() {
  return (
    <PhoneShell>
      <SkeletonBackBar />
      {/* progress strip */}
      <div style={{ padding: "12px 18px 13px", borderBottom: "1px solid rgba(244,241,234,.08)" }}>
        <div style={{ display: "flex", gap: "5px", marginBottom: "9px" }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} height={4} radius={2} style={{ flex: 1 }} />
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
          <Skeleton width="45%" height={14} />
          <Skeleton width="22%" height={10} />
        </div>
      </div>

      <div style={{ padding: "20px 18px 40px" }}>
        <Skeleton width="92%" height={13} />
        <Skeleton width="78%" height={13} style={{ marginTop: "8px" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "26px" }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "7px" }}>
              <Skeleton width="38%" height={11} />
              <Skeleton height={48} radius={11} />
            </div>
          ))}
        </div>

        <Skeleton height={54} radius={12} style={{ marginTop: "28px" }} />
      </div>
    </PhoneShell>
  );
}
