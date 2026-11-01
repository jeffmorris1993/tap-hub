import type { CSSProperties } from "react";

/**
 * Initials bubbles and role chips for the notification settings page.
 *
 * "extra" covers an address with no staff account — an env approver or a
 * hand-typed one — and "overflow" is the "+3" bubble that closes a stack.
 */
export type AvatarKind = "lead" | "pastoral" | "extra" | "overflow";

const BG: Record<AvatarKind, string> = {
  lead: "#e7b84e",
  pastoral: "#5ad07f",
  extra: "#3a4358",
  overflow: "#1a2438",
};

const FG: Record<AvatarKind, string> = {
  lead: "#0b101c",
  pastoral: "#0b101c",
  extra: "#f4f1ea",
  overflow: "#f4f1ea",
};

export type AvatarItem = { initials: string; kind: AvatarKind };

export function Avatar({
  initials,
  kind,
  size = 36,
  overlap = false,
  /**
   * The ring reads as a gap between overlapping bubbles, so it has to match
   * whatever is behind them — card by default. Pass the surface colour when a
   * stack sits on something else, or null for a chip where there's no overlap.
   */
  ringColor = "#121a2e",
}: {
  initials: string;
  kind: AvatarKind;
  size?: number;
  overlap?: boolean;
  ringColor?: string | null;
}) {
  const style: CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: "50%",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 900,
    fontSize: `${Math.round(size * 0.36)}px`,
    background: BG[kind],
    color: FG[kind],
    border: ringColor ? `2px solid ${ringColor}` : "none",
    marginLeft: overlap ? "-8px" : 0,
  };
  return (
    <span aria-hidden="true" style={style}>
      {initials}
    </span>
  );
}

/** Up to four bubbles, then a "+N" to stand for the rest. */
export function AvatarStack({
  items,
  size = 34,
  ringColor = "#121a2e",
}: {
  items: AvatarItem[];
  size?: number;
  ringColor?: string;
}) {
  const shown = items.slice(0, 4);
  const rest = items.length - shown.length;
  return (
    <span style={{ display: "flex", flexShrink: 0 }}>
      {shown.map((item, i) => (
        <Avatar
          key={`${item.initials}-${i}`}
          initials={item.initials}
          kind={item.kind}
          size={size}
          overlap={i > 0}
          ringColor={ringColor}
        />
      ))}
      {rest > 0 && (
        <Avatar
          initials={`+${rest}`}
          kind="overflow"
          size={size}
          overlap
          ringColor={ringColor}
        />
      )}
    </span>
  );
}

const TAG_BASE: CSSProperties = {
  flexShrink: 0,
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  padding: "5px 8px",
  borderRadius: "6px",
};

export function RoleTag({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return <span style={{ ...TAG_BASE, background: bg, color }}>{label}</span>;
}

/**
 * Tag for a recipient with no portal role — the prayer-team group, or an
 * address configured in env. Deliberately neutral: these aren't roles, so they
 * don't belong in ROLE_BADGE.
 */
export function NeutralTag({ label }: { label: string }) {
  return (
    <span
      style={{
        ...TAG_BASE,
        background: "rgba(154,163,184,.16)",
        color: "#cdd3e0",
      }}
    >
      {label}
    </span>
  );
}
