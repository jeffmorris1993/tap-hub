import { Skeleton, SkeletonList } from "../../../components/Skeleton";

/** Dashboard-shaped fallback; also covers admin child routes without their own. */
export default function AdminLoading() {
  return (
    <div>
      <Skeleton width="40%" height={32} style={{ marginBottom: 22 }} />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
          gap: "12px",
          marginBottom: 26,
        }}
      >
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            style={{
              background: "#121a2e",
              border: "1px solid rgba(244,241,234,.08)",
              borderRadius: "13px",
              padding: "18px",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <Skeleton width="60%" height={11} />
            <Skeleton width="35%" height={24} />
          </div>
        ))}
      </div>
      <SkeletonList rows={6} />
    </div>
  );
}
