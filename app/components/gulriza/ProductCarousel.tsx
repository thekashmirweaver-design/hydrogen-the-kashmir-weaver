"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import type {Product} from "~/models/types";
import {ProductTile} from "~/components/gulriza/ProductTile";
import {Reveal} from "~/components/gulriza/Reveal";
import {Hand} from "lucide-react";

const AUTO_SCROLL_MS = 5000;

export function ProductCarousel({products}: {products: Product[]}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const pausedRef = useRef(false);

  const getStep = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return 0;
    const first = el.firstElementChild as HTMLElement | null;
    if (first) return first.offsetWidth + 24;
    return el.clientWidth * 0.85;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollLeft > 10) setHasScrolled(true);
      const step = getStep();
      if (step > 0) setCurrentSlide(Math.round(el.scrollLeft / step));
    };
    el.addEventListener("scroll", handleScroll, {passive: true});
    return () => el.removeEventListener("scroll", handleScroll);
  }, [getStep]);

  const pause = useCallback(() => {
    pausedRef.current = true;
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el || products.length <= 1) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const tick = () => {
      if (pausedRef.current || !el) return;
      const step = getStep();
      if (step <= 0) return;
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) return;

      if (el.scrollLeft >= maxScroll - 8) {
        el.scrollTo({left: 0, behavior: "smooth"});
      } else {
        el.scrollTo({left: el.scrollLeft + step, behavior: "smooth"});
      }
    };

    const id = window.setInterval(tick, AUTO_SCROLL_MS);
    return () => window.clearInterval(id);
  }, [products.length]);

  return (
    <div className="relative">
      <div
        className={`pointer-events-none absolute right-4 top-[35%] z-10 flex -translate-y-1/2 items-center gap-2 rounded-full bg-background/80 px-3 py-2 text-[0.65rem] uppercase tracking-widest text-foreground shadow-sm backdrop-blur-md transition-opacity duration-500 motion-reduce:transition-none ${
          hasScrolled ? "opacity-0" : "opacity-100"
        }`}
      >
        <span>Swipe to explore</span>
        <Hand className="h-3 w-3 animate-pulse motion-reduce:animate-none" />
      </div>

      <div
        ref={scrollRef}
        onMouseEnter={pause}
        onMouseLeave={resume}
        onTouchStart={pause}
        onTouchEnd={() => window.setTimeout(resume, 4000)}
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-8 scroll-pl-6 overscroll-x-contain md:-mx-0 md:px-0 md:scroll-pl-0"
        style={{WebkitOverflowScrolling: "touch"}}
      >
        {products.map((product, idx) => (
          <div
            key={product.handle}
            className="w-[min(85vw,320px)] shrink-0 snap-start sm:w-[min(58vw,340px)] md:w-[min(32vw,300px)] lg:w-[280px] xl:w-[300px]"
          >
            <Reveal delay={idx * 100}>
              <ProductTile product={product} disableSwipe />
            </Reveal>
          </div>
        ))}
      </div>

      {products.length > 1 && (
        <div className="flex items-center justify-center gap-2">
          {products.map((_, idx) => (
            <button
              key={idx}
              onClick={() => {
                const step = getStep();
                if (step > 0) {
                  scrollRef.current?.scrollTo({left: step * idx, behavior: "smooth"});
                }
              }}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? "w-6 bg-foreground"
                  : "w-2 bg-foreground/30 hover:bg-foreground/50"
              }`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
