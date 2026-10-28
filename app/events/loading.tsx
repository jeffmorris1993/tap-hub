import { PhoneShell } from "../../components/PhoneShell";
import { Skeleton, SkeletonBackBar } from "../../components/Skeleton";

export default function EventsLoading() {
  return (
    <PhoneShell>
      <SkeletonBackBar />
      <div style={{ padding: "16px 18px 8px", display: "flex", gap: "8px", overflow: "hidden" }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} width={i === 0 ? 58 : 96} height={40} radius={10} />
        ))}
      </div>
      <div style={{ padding: "8px 18px 40px", display: "flex", flexDirection: "column", gap: "14px" }}>
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.08)",
              borderRadius: "16px",
              overflow: "hidden",
            }}
          >
            {/* date chip column */}
            <div
              style={{
                flexShrink: 0,
                width: "78px",
                background: "linear-gradient(160deg,#1c2740,#131c30)",
                borderRight: "1px solid rgba(231,184,78,.16)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
              }}
            >
              <Skeleton width={28} height={9} />
              <Skeleton width={34} height={26} />
            </div>
            <div style={{ flex: 1, minWidth: 0, padding: "15px 16px", display: "flex", flexDirection: "column", gap: "9px" }}>
              <Skeleton width={72} height={18} radius={6} />
              <Skeleton width="70%" height={17} />
              <Skeleton width="55%" height={10} />
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: "3px" }}>
                <Skeleton width="40%" height={11} />
                <Skeleton width={58} height={11} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
