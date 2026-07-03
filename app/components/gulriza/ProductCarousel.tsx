"use client";

import { useRef, useEffect, useState } from "react";
import type { Product } from "~/models/types";
import { ProductTile } from "~/components/gulriza/ProductTile";
import { Reveal } from "~/components/gulriza/Reveal";
import { Hand } from "lucide-react";

export function ProductCarousel({ products }: { products: Product[] }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [hasScrolled, setHasScrolled] = useState(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      if (el.scrollLeft > 10 && !hasScrolled) {
        setHasScrolled(true);
      }
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [hasScrolled]);

  return (
    <div className="relative">
      {/* Mobile swipe indicator */}
      <div
        className={`pointer-events-none absolute right-4 top-[35%] z-10 flex -translate-y-1/2 items-center gap-2 rounded-full bg-background/80 px-3 py-2 text-[0.65rem] uppercase tracking-widest text-foreground shadow-sm backdrop-blur-md transition-opacity duration-500 md:hidden ${
          hasScrolled ? "opacity-0" : "opacity-100"
        }`}
      >
        <span>Swipe to explore</span>
        <Hand className="h-3 w-3 animate-pulse" />
      </div>

      <div
        ref={scrollRef}
        className="no-scrollbar -mx-6 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-8 scroll-pl-6 md:mx-0 md:grid md:grid-cols-2 md:snap-none md:overflow-visible md:px-0 md:scroll-pl-0 lg:grid-cols-4"
      >
        {products.map((product, idx) => (
          <div key={product.handle} className="w-[85vw] shrink-0 snap-start sm:w-[60vw] md:w-auto">
            <Reveal delay={idx * 100}>
              <ProductTile product={product} />
            </Reveal>
          </div>
        ))}
      </div>
    </div>
  );
}
