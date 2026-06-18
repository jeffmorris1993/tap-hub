export function EventHero({
  hue,
  height = 140,
  children,
}: {
  hue: number;
  height?: number;
  children?: React.ReactNode;
}) {
  return (
    <div
      style={{
        width: "100%",
        height: `${height}px`,
        background: `linear-gradient(135deg, hsl(${hue} 50% 28%), hsl(${(hue + 30) % 360} 40% 18%))`,
        position: "relative",
      }}
    >
      {children}
    </div>
  );
}
