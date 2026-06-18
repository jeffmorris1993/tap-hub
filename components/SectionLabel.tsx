import type { ReactNode } from "react";

export function SectionLabel({ children, style }: { children: ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        fontSize: "11.5px",
        fontWeight: 800,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
        color: "#6a738b",
        ...style,
      }}
    >
      {children}
    </div>
  );
}
