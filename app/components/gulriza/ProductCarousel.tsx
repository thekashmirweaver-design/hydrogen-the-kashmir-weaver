"use client";

import {useCallback, useEffect, useRef, useState} from "react";
import type {Product} from "~/models/types";
import {ProductTile} from "~/components/gulriza/ProductTile";
import {Reveal} from "~/components/gulriza/Reveal";
import {Hand} from "lucide-react";

export function ProductCarousel({products}: {products: Product[]}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startScroll: number;
    moved: boolean;
  } | null>(null);

  const updateFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || products.length <= 1) return;

    if (el.scrollLeft > 10) setHasScrolled(true);

    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) {
      setCurrentSlide(0);
      return;
    }

    // Map scroll across the full range so the last dot activates at the end
    // when multiple cards are visible (desktop).
    const progress = Math.min(1, Math.max(0, el.scrollLeft / maxScroll));
    setCurrentSlide(Math.round(progress * (products.length - 1)));
  }, [products.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    updateFromScroll();

    const handleScroll = () => updateFromScroll();
    el.addEventListener("scroll", handleScroll, {passive: true});

    const ro = new ResizeObserver(() => updateFromScroll());
    ro.observe(el);

    return () => {
      el.removeEventListener("scroll", handleScroll);
      ro.disconnect();
    };
  }, [updateFromScroll]);

  const onPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    // Touch/pen already get native overflow scrolling; only drag with mouse.
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    const el = scrollRef.current;
    if (!el) return;

    // Do NOT setPointerCapture here — capturing on pointerdown retargets
    // pointerup/click away from product Links and blocks navigation.
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startScroll: el.scrollLeft,
      moved: false,
    };
  }, []);

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag || !el || e.pointerId !== drag.pointerId) return;

    const dx = e.clientX - drag.startX;
    if (!drag.moved && Math.abs(dx) > 4) {
      drag.moved = true;
      // Capture only after a real drag starts so simple clicks still hit Links.
      el.setPointerCapture(e.pointerId);
      el.classList.add("cursor-grabbing");
    }
    if (!drag.moved) return;

    el.scrollLeft = drag.startScroll - dx;
    e.preventDefault();
  }, []);

  const endDrag = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = scrollRef.current;
    if (!drag || e.pointerId !== drag.pointerId) return;

    if (el?.hasPointerCapture(e.pointerId)) {
      el.releasePointerCapture(e.pointerId);
    }
    el?.classList.remove("cursor-grabbing");

    // Prevent the click that follows a drag from opening a product.
    if (drag.moved) {
      const suppress = (ev: Event) => {
        ev.preventDefault();
        ev.stopPropagation();
      };
      el?.addEventListener("click", suppress, {capture: true, once: true});
    }

    dragRef.current = null;
  }, []);

  if (!products.length) return null;

  return (
    <div className="relative">
      <div
        className={`pointer-events-none absolute right-4 top-[35%] z-10 flex -translate-y-1/2 items-center gap-2 rounded-full bg-background/80 px-3 py-2 text-[0.65rem] uppercase tracking-widest text-foreground shadow-sm backdrop-blur-md transition-opacity duration-500 motion-reduce:transition-none md:right-0 ${
          hasScrolled ? "opacity-0" : "opacity-100"
        }`}
      >
        <span>Swipe to explore</span>
        <Hand className="h-3 w-3 animate-pulse motion-reduce:animate-none" />
      </div>

      <div
        ref={scrollRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className="no-scrollbar -mx-6 flex snap-x snap-proximity gap-6 overflow-x-auto overscroll-x-contain px-6 pb-8 scroll-pl-6 select-none md:-mx-0 md:cursor-grab md:px-0 md:scroll-pl-0"
        style={{WebkitOverflowScrolling: "touch", touchAction: "pan-x pan-y"}}
      >
        {products.map((product, idx) => (
          <div
            key={product.handle}
            className="w-[min(85vw,320px)] shrink-0 snap-start sm:w-[min(58vw,340px)] md:w-[min(32vw,300px)] lg:w-[280px] xl:w-[300px]"
          >
            <Reveal delay={idx * 100}>
              <ProductTile
                product={product}
                disableSwipe
                priority={idx < 2}
                sizes="(min-width: 1280px) 300px, (min-width: 1024px) 280px, (min-width: 768px) 32vw, 85vw"
              />
            </Reveal>
          </div>
        ))}
      </div>

      {products.length > 1 && (
        <div
          className="flex items-center justify-center gap-1.5"
          role="group"
          aria-label="Carousel position"
        >
          {products.map((_, idx) => (
            <span
              key={idx}
              aria-hidden
              className={`block rounded-full transition-all duration-300 ${
                idx === currentSlide
                  ? "h-1.5 w-6 bg-foreground"
                  : "h-1.5 w-1.5 bg-foreground/30"
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
