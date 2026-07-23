"use client";

import {useEffect, useState} from "react";
import {Pointer} from "lucide-react";
import {useCartDrawer} from "~/contexts/cart-drawer-context";

export const COLLECTION_PRODUCTS_ID = "collection-products";

function scrollToProducts() {
  document.getElementById(COLLECTION_PRODUCTS_ID)?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

/** Hides once the products section enters the viewport. Clears FAB speed dial when bag has items. */
export function CollectionProductsScrollCue() {
  const [visible, setVisible] = useState(true);
  const {cartQuantity} = useCartDrawer();
  const bagOpen = cartQuantity > 0;

  useEffect(() => {
    const products = document.getElementById(COLLECTION_PRODUCTS_ID);
    if (!products) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) setVisible(false);
      },
      {threshold: 0},
    );

    observer.observe(products);
    return () => observer.disconnect();
  }, []);

  return (
    <button
      type="button"
      onClick={scrollToProducts}
      aria-label="View products in this collection"
      className={`fixed left-1/2 z-40 flex -translate-x-1/2 flex-col items-center gap-1 transition-opacity duration-500 md:gap-2 ${
        visible ? "opacity-100" : "pointer-events-none opacity-0"
      } ${bagOpen ? "max-md:-translate-x-[calc(50%+2.75rem)]" : ""}`}
      style={{
        // Lift above FAB speed dial when the bag has items (FAB sits bottom-right).
        bottom: bagOpen
          ? "calc(5.5rem + env(safe-area-inset-bottom))"
          : "calc(1.5rem + env(safe-area-inset-bottom))",
      }}
    >
      <span className="tracked text-[0.6rem] text-muted-foreground md:text-[0.65rem]">
        View Products
      </span>
      <span className="flex h-10 w-10 items-center justify-center">
        <Pointer className="h-5 w-5 animate-swipe-up text-accent" strokeWidth={1.5} />
      </span>
    </button>
  );
}
