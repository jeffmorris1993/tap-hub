import Link from "next/link";
import type { ReactNode } from "react";

export function HubTile({
  href,
  icon,
  title,
  sub,
  external,
}: {
  href: string;
  icon: ReactNode;
  title: string;
  sub: string;
  external?: boolean;
}) {
  const style: React.CSSProperties = {
    background: "#121a2e",
    border: "1px solid rgba(244,241,234,.08)",
    borderRadius: "16px",
    padding: "18px",
    minHeight: "138px",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
    textDecoration: "none",
    color: "inherit",
  };

  const inner = (
    <>
      <span
        style={{
          width: "46px",
          height: "46px",
          borderRadius: "12px",
          background: "#1a2438",
          border: "1px solid rgba(231,184,78,.28)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {icon}
      </span>
      <div>
        <div
          style={{
            fontFamily: "var(--font-anton)",
            fontWeight: 400,
            textTransform: "uppercase",
            fontSize: "17px",
            lineHeight: 1,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: "12px",
            color: "#9aa3b8",
            fontWeight: 600,
            marginTop: "4px",
          }}
        >
          {sub}
        </div>
      </div>
    </>
  );

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" style={style}>
        {inner}
      </a>
    );
  }
  return (
    <Link href={href} style={style}>
      {inner}
    </Link>
  );
}
