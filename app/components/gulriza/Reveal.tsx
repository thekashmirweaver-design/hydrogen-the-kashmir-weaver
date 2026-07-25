"use client";

import {useEffect, useRef, useState, type ReactNode} from "react";

export function Reveal({
  children,
  delay = 0,
  className = "",
  as: As = "div",
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: React.ElementType;
}) {
  const ref = useRef<HTMLDivElement>(null);
  // Default: no hide (SSR + above-fold). Only arm the opacity:0 animation for
  // below-fold nodes after mount — otherwise FCP/LCP wait on hydration.
  const [armed, setArmed] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const rect = el.getBoundingClientRect();
    const inView =
      rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
    if (inView) return;

    setArmed(true);
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            window.setTimeout(() => setShown(true), delay);
            io.disconnect();
          }
        });
      },
      {threshold: 0.15},
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay]);

  const revealClass = armed
    ? `reveal ${shown ? "reveal-in" : ""}`
    : "";

  return (
    <As ref={ref} className={`${revealClass} ${className}`.trim()}>
      {children}
    </As>
  );
}
