type Size = "sm" | "md" | "lg";

type Spec = { tall: number; narrow: number; wide: number; gap: number };

const SIZES: Record<Size, Spec> = {
  sm: { tall: 10, narrow: 8, wide: 13, gap: 2 },
  md: { tall: 13, narrow: 9, wide: 15, gap: 2 },
  lg: { tall: 15, narrow: 10, wide: 17, gap: 2 },
};

function Row({ spec, widths }: { spec: Spec; widths: number[] }) {
  return (
    <span
      style={{
        display: "flex",
        gap: `${spec.gap}px`,
        lineHeight: 0,
      }}
    >
      {widths.map((w, i) => (
        <span
          key={i}
          style={{
            display: "block",
            width: `${w}px`,
            height: `${spec.tall}px`,
            background: "#e7b84e",
            borderRadius: "1.5px",
          }}
        />
      ))}
    </span>
  );
}

export function LogoMark({ size = "md" }: { size?: Size }) {
  const s = SIZES[size];
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: `${s.gap}px`,
        alignItems: "center",
        flexShrink: 0,
        lineHeight: 0,
      }}
    >
      <Row spec={s} widths={[s.wide, s.wide, s.wide]} />
      <Row spec={s} widths={[s.narrow, s.wide, s.wide, s.narrow]} />
      <Row spec={s} widths={[s.wide, s.wide, s.wide]} />
    </span>
  );
}
