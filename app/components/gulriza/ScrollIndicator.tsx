"use client";

import { useEffect, useState } from "react";
import { Pointer } from "lucide-react";

export function ScrollIndicator({ className = "" }: { className?: string }) {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      // Hide the indicator once the user has scrolled down a bit
      if (window.scrollY > 50) {
        setHidden(true);
      } else {
        setHidden(false);
      }
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    // Initialize state on mount
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={`flex flex-col items-center gap-1 transition-opacity duration-500 md:gap-2 ${
        hidden ? "opacity-0 pointer-events-none" : "opacity-100"
      } ${className}`}
      aria-hidden="true"
    >
      <span className="tracked text-[0.6rem] text-muted-foreground md:text-[0.65rem]">Swipe</span>
      <div className="flex h-10 w-10 items-center justify-center">
        <Pointer className="h-5 w-5 animate-swipe-up text-accent" strokeWidth={1.5} />
      </div>
    </div>
  );
}
