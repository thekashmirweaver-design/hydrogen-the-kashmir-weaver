'use client';

import {useEffect, useRef, useState, type ReactNode} from 'react';
import {Hand} from 'lucide-react';

/** Wraps a horizontal scroll container with a mobile swipe cue that hides after scroll. */
export function HorizontalScrollCue({
  children,
  className = '',
  cueLabel = 'Swipe',
  cueClassName = 'md:hidden',
}: {
  children: ReactNode;
  className?: string;
  cueLabel?: string;
  cueClassName?: string;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollLeft > 10) setHasScrolled(true);
    };
    el.addEventListener('scroll', handleScroll, {passive: true});
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="relative">
      <div
        className={`pointer-events-none absolute right-2 top-1/2 z-10 flex -translate-y-1/2 items-center gap-1.5 rounded-full bg-background/80 px-2.5 py-1.5 text-[0.6rem] uppercase tracking-widest text-foreground shadow-sm backdrop-blur-md transition-opacity duration-500 motion-reduce:transition-none ${cueClassName} ${
          hasScrolled ? 'opacity-0' : 'opacity-100'
        }`}
      >
        <span>{cueLabel}</span>
        <Hand className="h-3 w-3 animate-pulse motion-reduce:animate-none" />
      </div>
      <div ref={scrollRef} className={className}>
        {children}
      </div>
    </div>
  );
}
