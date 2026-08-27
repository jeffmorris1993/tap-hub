import { PhoneShell } from "../components/PhoneShell";
import { Skeleton } from "../components/Skeleton";

export default function HubLoading() {
  return (
    <PhoneShell>
      <div style={{ padding: "14px 20px" }}>
        <Skeleton width="70%" height={30} style={{ marginTop: 46 }} />
        <Skeleton width="50%" height={30} style={{ marginTop: 8 }} />
        <Skeleton width="85%" height={13} style={{ marginTop: 14 }} />
        {/* gold "I'm New" block */}
        <Skeleton height={92} radius={16} style={{ marginTop: 18 }} />
        {/* tile grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "12px",
            marginTop: 14,
          }}
        >
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} height={138} radius={16} />
          ))}
        </div>
      </div>
    </PhoneShell>
  );
}
