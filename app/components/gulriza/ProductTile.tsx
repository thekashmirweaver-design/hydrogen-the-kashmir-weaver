import {Link} from "react-router";
import {useCallback, useEffect, useState} from "react";
import type {Product} from "~/models/types";
import {useFormatPrice} from "~/lib/currency-store";
import {CatalogImage} from "~/components/gulriza/CatalogImage";
import {useHorizontalSwipe} from "~/hooks/use-horizontal-swipe";

const TILE_CAROUSEL_MS = 1400;
const MAX_DOT_INDICATORS = 5;

function TileImageIndicator({
  active,
  total,
}: {
  active: number;
  total: number;
}) {
  if (total <= MAX_DOT_INDICATORS) {
    return (
      <div className="pointer-events-none absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
        {Array.from({length: total}, (_, i) => (
          <span
            key={i}
            className="h-1.5 w-1.5 rounded-full transition-colors duration-300"
            style={{
              background: i === active ? "var(--accent)" : "rgba(255,255,255,0.35)",
            }}
          />
        ))}
      </div>
    );
  }

  const progress = total > 1 ? ((active + 1) / total) * 100 : 100;

  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex flex-col items-center gap-2 px-4">
      <span className="rounded-full bg-black/35 px-2.5 py-0.5 text-[0.65rem] tracking-[0.2em] text-white/90 backdrop-blur-sm">
        {active + 1} / {total}
      </span>
      <div
        className="h-0.5 w-[min(72%,7rem)] overflow-hidden rounded-full bg-white/25"
        role="progressbar"
        aria-valuenow={active + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        aria-label={`Image ${active + 1} of ${total}`}
      >
        <span
          className="block h-full rounded-full bg-accent transition-[width] duration-300 ease-out"
          style={{width: `${progress}%`}}
        />
      </div>
    </div>
  );
}

export function ProductTile({product}: {product: Product}) {
  const [hover, setHover] = useState(false);
  const [active, setActive] = useState(0);
  const [loadExtras, setLoadExtras] = useState(false);
  const formatPrice = useFormatPrice();
  const imageCount = product.images.length;
  const multiImage = imageCount > 1;
  const soldOut = product.stock === "out";
  const onSale =
    product.compareAtPrice != null && product.compareAtPrice.amount > product.price.amount;

  const goNext = useCallback(() => {
    setLoadExtras(true);
    setActive((i) => (i + 1) % imageCount);
  }, [imageCount]);

  const goPrev = useCallback(() => {
    setLoadExtras(true);
    setActive((i) => (i - 1 + imageCount) % imageCount);
  }, [imageCount]);

  const tileSwipe = useHorizontalSwipe({
    onSwipeLeft: goNext,
    onSwipeRight: goPrev,
    enabled: multiImage,
    containSwipe: true,
  });

  const displayIndex = loadExtras ? active : 0;
  const displayImage = product.images[displayIndex] ?? product.images[0];
  const showIndicator = multiImage && loadExtras;

  useEffect(() => {
    if (!hover || !multiImage) return;
    const id = window.setInterval(() => {
      setActive((i) => (i + 1) % imageCount);
    }, TILE_CAROUSEL_MS);
    return () => window.clearInterval(id);
  }, [hover, multiImage, imageCount]);

  const handlePointerEnter = () => {
    setHover(true);
    if (multiImage) setLoadExtras(true);
  };

  const priceBlock = onSale ? (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
      <span style={{color: "var(--accent)"}}>{formatPrice(product.price)}</span>
      <span className="text-muted-foreground line-through">
        {formatPrice(product.compareAtPrice!)}
      </span>
    </div>
  ) : (
    <div className="text-sm text-muted-foreground">{formatPrice(product.price)}</div>
  );

  return (
    <article className="group flex h-full flex-col">
      <Link
        to={`/products/${product.handle}`}
        prefetch="intent"
        onMouseEnter={handlePointerEnter}
        onFocus={handlePointerEnter}
        onMouseLeave={() => {
          setHover(false);
          setActive(0);
          setLoadExtras(false);
        }}
        onBlur={() => {
          setHover(false);
          setActive(0);
          setLoadExtras(false);
        }}
        className="block"
      >
        <div
          className="relative aspect-[4/5] w-full touch-pan-y select-none overflow-hidden"
          style={{background: "var(--surface)"}}
          {...tileSwipe}
        >
          <CatalogImage
            key={displayImage.src}
            image={displayImage}
            wrapperClassName="absolute inset-0"
            className="h-full w-full object-cover transition-opacity duration-700 motion-reduce:transition-none"
            style={{
              filter: soldOut ? "grayscale(0.6)" : undefined,
            }}
            loading={displayIndex === 0 ? "lazy" : "eager"}
          />

          {showIndicator ? (
            <TileImageIndicator active={active} total={imageCount} />
          ) : null}
        </div>
      </Link>

      <div className="mt-4 flex min-h-0 flex-1 flex-col gap-2 sm:mt-5">
        <p className="eyebrow truncate opacity-70">{product.collectionName}</p>
        <Link
          to={`/products/${product.handle}`}
          prefetch="intent"
          className="font-display text-lg leading-snug hover:text-accent sm:text-xl line-clamp-2"
        >
          {product.name}
        </Link>
        {priceBlock}
      </div>
    </article>
  );
}
