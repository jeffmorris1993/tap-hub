"use client";

import { useEffect, useState } from "react";

function greetingForHour(hour: number): string {
  if (hour < 5) return "Welcome";
  if (hour < 12) return "Good Morning";
  if (hour < 17) return "Good Afternoon";
  if (hour < 21) return "Good Evening";
  return "Good Night";
}

/** Time-aware greeting that ticks every minute so a long-open page stays right. */
export function Greeting() {
  const [text, setText] = useState(() => greetingForHour(new Date().getHours()));
  useEffect(() => {
    const tick = () => setText(greetingForHour(new Date().getHours()));
    tick();
    const id = setInterval(tick, 60000);
    return () => clearInterval(id);
  }, []);
  return <>{text}.</>;
}
