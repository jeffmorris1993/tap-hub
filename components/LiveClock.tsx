"use client";

import { useEffect, useState } from "react";

function format(now: Date) {
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  let h = now.getHours();
  const m = now.getMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${dayNames[now.getDay()]} · ${h}:${m < 10 ? "0" + m : m} ${ap}`;
}

export function LiveClock({ className, style }: { className?: string; style?: React.CSSProperties }) {
  const [label, setLabel] = useState(() => format(new Date()));
  useEffect(() => {
    const tick = () => setLabel(format(new Date()));
    tick();
    const id = setInterval(tick, 20000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className={className} style={style}>
      {label}
    </span>
  );
}
