/**
 * Kiosk placeholder: the same dark ground and layout bones as the real screen,
 * so a TV that's mid-load doesn't flash a white page at a room.
 */
export default function Loading() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#0b101c",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "clamp(24px, 5vw, 72px)",
        flexWrap: "wrap",
        padding: "24px",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}>
        <div
          className="th-skel"
          style={{ width: "min(70vw, 360px)", height: "56px", borderRadius: "12px" }}
        />
        <div
          className="th-skel"
          style={{ width: "min(60vw, 280px)", height: "22px", borderRadius: "8px" }}
        />
      </div>
      <div
        className="th-skel"
        style={{ width: "min(78vw, 400px)", aspectRatio: "1", borderRadius: "24px" }}
      />
    </div>
  );
}
