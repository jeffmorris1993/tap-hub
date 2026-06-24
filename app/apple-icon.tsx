import { ImageResponse } from "next/og";

// iOS expects a 180×180 PNG. We render the same gold block-glyph logo
// over the brand navy so a TapHub bookmark on a home screen looks
// like the in-app sidebar tile.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

// Re-derived from app/icon.svg (64×64). Scale factor for 180 is
// 180/64 = 2.8125 — applied to all positions/sizes below.
const S = 180 / 64;
function px(n: number): number {
  return n * S;
}

function Bar({ x, y, w, h }: { x: number; y: number; w: number; h: number }) {
  return (
    <div
      style={{
        position: "absolute",
        left: px(x),
        top: px(y),
        width: px(w),
        height: px(h),
        background: "#e7b84e",
        borderRadius: px(1.5),
      }}
    />
  );
}

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#0b101c",
          borderRadius: px(12),
          position: "relative",
          display: "flex",
        }}
      >
        {/* row 1 */}
        <Bar x={7.5} y={10.5} w={15} h={13} />
        <Bar x={24.5} y={10.5} w={15} h={13} />
        <Bar x={41.5} y={10.5} w={15} h={13} />
        {/* row 2 */}
        <Bar x={5} y={25.5} w={9} h={13} />
        <Bar x={16} y={25.5} w={15} h={13} />
        <Bar x={33} y={25.5} w={15} h={13} />
        <Bar x={50} y={25.5} w={9} h={13} />
        {/* row 3 */}
        <Bar x={7.5} y={40.5} w={15} h={13} />
        <Bar x={24.5} y={40.5} w={15} h={13} />
        <Bar x={41.5} y={40.5} w={15} h={13} />
      </div>
    ),
    { ...size },
  );
}
