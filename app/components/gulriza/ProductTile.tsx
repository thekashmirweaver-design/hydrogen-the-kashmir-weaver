import {Link} from "react-router";
import { useEffect, useState } from "react";
import type { Product } from "~/models/types";
import { useFormatPrice } from "~/lib/currency-store";
import { CatalogImage } from "~/components/gulriza/CatalogImage";

export function ProductTile({ product }: { product: Product }) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(0);
  const formatPrice = useFormatPrice();
  const multiImage = product.images.length > 1;
  const soldOut = product.stock === "out";
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice.amount > product.price.amount;

  // While hovered, auto-advance through every image as a crossfading carousel.
  // The interval only runs on hover and is cleared on mouse-leave / unmount.
  useEffect(() => {
    if (!hover || !multiImage) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % product.images.length);
    }, 950);
    return () => window.clearInterval(id);
  }, [hover, multiImage, product.images.length]);

  return (
    <div className="group block">
      <Link
        to={`/products/${product.handle}`}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => {
          setHover(false);
          setActive(0);
        }}
        className="block"
      >
        <div
          className="relative aspect-[4/5] w-full overflow-hidden"
          style={{ background: "var(--surface)" }}
        >
          {product.images.map((img, i) => (
            <CatalogImage
              key={`${img.src}-${i}`}
              image={{...img, alt: i === 0 ? img.alt : ""}}
              className="absolute inset-0 h-full w-full object-cover transition-opacity duration-700"
              style={{
                opacity: i === active ? 1 : 0,
                filter: soldOut ? "grayscale(0.6)" : undefined,
              }}
            />
          ))}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 55%, rgba(8,16,15,0.6) 100%)",
            }}
          />

          {/* Position indicators (only while cycling through multiple images) */}
          {hover && multiImage && (
            <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
              {product.images.map((img, i) => (
                <span
                  key={`dot-${img.src}-${i}`}
                  className="h-1.5 w-1.5 rounded-full transition-colors duration-300"
                  style={{
                    background: i === active ? "var(--accent)" : "rgba(255,255,255,0.35)",
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </Link>

      <div className="mt-4 flex flex-col gap-4 sm:mt-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
        <div className="min-w-0 flex-1">
          <div className="eyebrow truncate opacity-70">{product.collectionName}</div>
          <Link
            to={`/products/${product.handle}`}
            className="mt-2 block font-display text-lg leading-tight hover:text-accent sm:text-xl"
          >
            {product.name}
          </Link>
        </div>
        <div className="flex items-center justify-between sm:flex-col sm:items-end sm:gap-3">
          {onSale ? (
            <div className="flex items-center gap-2 text-sm">
              <span style={{ color: "var(--accent)" }}>{formatPrice(product.price)}</span>
              <span className="text-muted-foreground line-through">
                {formatPrice(product.compareAtPrice!)}
              </span>
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">{formatPrice(product.price)}</div>
          )}
        </div>
      </div>
    </div>
  );
}
