import { PhoneShell } from "../../components/PhoneShell";
import { Skeleton, SkeletonBackBar } from "../../components/Skeleton";

export default function AnnouncementsLoading() {
  return (
    <PhoneShell>
      <SkeletonBackBar />
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} width={68} height={32} radius={16} />
          ))}
        </div>
        {Array.from({ length: 4 }, (_, i) => (
          <div
            key={i}
            style={{
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.08)",
              borderRadius: "14px",
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              gap: "10px",
            }}
          >
            <Skeleton width="25%" height={11} />
            <Skeleton width="75%" height={16} />
            <Skeleton width="90%" height={12} />
            <Skeleton width="40%" height={11} />
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
