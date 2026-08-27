import { PhoneShell } from "../../components/PhoneShell";
import { Skeleton, SkeletonBackBar } from "../../components/Skeleton";

export default function TodayLoading() {
  return (
    <PhoneShell>
      <SkeletonBackBar />
      <div style={{ padding: "20px 18px" }}>
        {/* hero card */}
        <Skeleton height={140} radius={18} />
        {/* schedule rows with the time-column shape */}
        <Skeleton width="45%" height={12} style={{ margin: "26px 0 14px" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {Array.from({ length: 4 }, (_, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "14px",
                background: "#121a2e",
                border: "1px solid rgba(244,241,234,.08)",
                borderRadius: "14px",
                padding: "14px 16px",
              }}
            >
              <div style={{ width: 64, display: "flex", flexDirection: "column", alignItems: "center", gap: 6, flexShrink: 0 }}>
                <Skeleton width={40} height={16} />
                <Skeleton width={22} height={9} />
              </div>
              <div style={{ width: 1, alignSelf: "stretch", background: "rgba(244,241,234,.1)" }} />
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                <Skeleton width="55%" height={13} />
                <Skeleton width="40%" height={11} />
              </div>
              <Skeleton width={48} height={24} radius={6} />
            </div>
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
