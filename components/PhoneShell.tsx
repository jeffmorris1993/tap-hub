import type { ReactNode } from "react";

export function PhoneShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: "100%",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div
        className="tap-scroll"
        style={{
          width: "100%",
          maxWidth: "468px",
          background: "#0b101c",
          position: "relative",
          overflowX: "hidden",
          boxShadow: "0 0 90px rgba(0,0,0,.6)",
          borderLeft: "1px solid rgba(244,241,234,.05)",
          borderRight: "1px solid rgba(244,241,234,.05)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        {children}
      </div>
    </div>
  );
}
