/** Loading placeholders used by the route loading.tsx files. */

export function Skeleton({
  width,
  height,
  radius,
  style,
}: {
  width?: string | number;
  height?: string | number;
  radius?: string | number;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className="th-skel"
      style={{ width, height, borderRadius: radius ?? 8, ...style }}
    />
  );
}

/** A card-shaped row with a title bar and a shorter sub bar. */
export function SkeletonRow({ height = 72 }: { height?: number }) {
  return (
    <div
      style={{
        background: "#121a2e",
        border: "1px solid rgba(244,241,234,.08)",
        borderRadius: "13px",
        padding: "16px 18px",
        height,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "10px",
      }}
    >
      <Skeleton width="40%" height={14} />
      <Skeleton width="60%" height={11} />
    </div>
  );
}

export function SkeletonList({ rows, rowHeight }: { rows: number; rowHeight?: number }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
      {Array.from({ length: rows }, (_, i) => (
        <SkeletonRow key={i} height={rowHeight} />
      ))}
    </div>
  );
}

/** Sticky-header-shaped block matching BackBar's footprint on public pages. */
export function SkeletonBackBar() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "16px 18px",
        borderBottom: "1px solid rgba(244,241,234,.07)",
      }}
    >
      <Skeleton width={38} height={38} radius={11} />
      <div style={{ display: "flex", flexDirection: "column", gap: "7px", flex: 1 }}>
        <Skeleton width="55%" height={15} />
        <Skeleton width="35%" height={10} />
      </div>
    </div>
  );
}
