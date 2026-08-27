import { PhoneShell } from "../../components/PhoneShell";
import { Skeleton, SkeletonBackBar } from "../../components/Skeleton";

export default function EventsLoading() {
  return (
    <PhoneShell>
      <SkeletonBackBar />
      <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} width={76} height={34} radius={17} />
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
            <Skeleton width="30%" height={11} />
            <Skeleton width="70%" height={17} />
            <Skeleton width="50%" height={12} />
          </div>
        ))}
      </div>
    </PhoneShell>
  );
}
