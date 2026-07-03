import {Link, type FetcherWithComponents} from 'react-router';
import {useEffect, useMemo, useRef, useState} from 'react';
import {ChevronLeft, ChevronRight, ArrowRight, Expand, X} from 'lucide-react';
import {CartForm} from '@shopify/hydrogen';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Accordion} from '~/components/gulriza/Accordion';
import {ProductTile} from '~/components/gulriza/ProductTile';
import {CatalogImage} from '~/components/gulriza/CatalogImage';
import {Reveal} from '~/components/gulriza/Reveal';
import type {Product, ProductVariant} from '~/models/types';
import {useFormatPrice} from '~/lib/currency-store';
import {useFocusTrap} from '~/hooks/use-focus-trap';

export function ProductView({
  product,
  relatedProducts,
}: {
  product: Product;
  relatedProducts: Product[];
}) {
  const variants = product.variants ?? [];
  const initialVariant =
    variants.find((v) => v.id === product.variantId) ??
    variants.find((v) => v.availableForSale) ??
    variants[0];

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(
    () =>
      Object.fromEntries(
        (initialVariant?.selectedOptions ?? []).map((o) => [o.name, o.value]),
      ),
  );

  const selectedVariant = useMemo((): ProductVariant | null => {
    if (!variants.length) return null;
    const match = variants.find((v) =>
      v.selectedOptions.every((o) => selectedOptions[o.name] === o.value),
    );
    return match ?? initialVariant ?? null;
  }, [variants, selectedOptions, initialVariant]);

  const activeVariantId = selectedVariant?.id ?? product.variantId;
  const displayPrice = selectedVariant?.price ?? product.price;
  const displayImages = useMemo(() => {
    if (selectedVariant?.image) {
      const rest = product.images.filter((i) => i.src !== selectedVariant.image!.src);
      return [selectedVariant.image, ...rest];
    }
    return product.images;
  }, [product.images, selectedVariant?.image]);

  const [imgIdx, setImgIdx] = useState(0);
  const [fullOpen, setFullOpen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const formatPrice = useFormatPrice();
  useFocusTrap(fullOpen, lightboxRef);

  useEffect(() => {
    setImgIdx(0);
  }, [selectedVariant?.id]);

  const soldOut =
    selectedVariant != null
      ? !selectedVariant.availableForSale
      : product.stock === 'out';
  const isShopifyVariant = activeVariantId?.startsWith('gid://') ?? false;

  const imgCount = displayImages.length;
  const prevImg = () => setImgIdx((i) => (i - 1 + imgCount) % imgCount);
  const nextImg = () => setImgIdx((i) => (i + 1) % imgCount);

  const related = relatedProducts;

  useEffect(() => {
    if (!fullOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullOpen(false);
      else if (e.key === 'ArrowLeft' && imgCount > 1) prevImg();
      else if (e.key === 'ArrowRight' && imgCount > 1) nextImg();
    };
    window.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [fullOpen, imgCount]);

  return (
    <div>
      <div className="mx-auto max-w-[1600px] px-6 pt-[calc(var(--header-h)+1.5rem)] md:px-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-[0.25em] text-muted-foreground uppercase">
          <Link to="/" className="hover:text-accent">
            Home
          </Link>
          <span>/</span>
          <Link to="/collections" className="hover:text-accent">
            Collections
          </Link>
          <span>/</span>
          <Link to={`/collections/${product.collectionSlug}`} className="hover:text-accent">
            {product.collectionName}
          </Link>
        </div>
      </div>

      <section className="mx-auto grid max-w-[1600px] grid-cols-1 gap-16 px-6 py-12 lg:grid-cols-[1.1fr_1fr] md:gap-16 lg:gap-24 md:px-10 md:py-20">
        <div>
          <div
            className="relative aspect-[4/5] w-full overflow-hidden"
            style={{background: 'var(--surface)'}}
          >
            <CatalogImage
              image={displayImages[imgIdx]}
              onClick={() => setFullOpen(true)}
              className="absolute inset-0 h-full w-full cursor-zoom-in object-cover"
              loading="eager"
            />
            <div className="absolute inset-0 vignette-overlay pointer-events-none" />
            <button
              aria-label="View full screen"
              onClick={() => setFullOpen(true)}
              className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-full border transition hover:text-accent"
              style={{
                borderColor: 'var(--border)',
                background: 'rgba(8,16,15,0.4)',
              }}
            >
              <Expand className="h-4 w-4" strokeWidth={1} />
            </button>

            {soldOut && (
              <div
                className="absolute left-5 top-5 px-3 py-1 text-[0.65rem] tracking-[0.3em] uppercase"
                style={{
                  background: 'rgba(8,16,15,0.7)',
                  color: 'var(--accent)',
                  border: '1px solid var(--accent)',
                }}
              >
                Sold Out
              </div>
            )}
            {product.limited && !soldOut && (
              <div
                className="absolute left-5 top-5 px-3 py-1 text-[0.65rem] tracking-[0.3em] uppercase"
                style={{
                  background: 'rgba(8,16,15,0.55)',
                  color: 'var(--accent)',
                }}
              >
                N°1 of 1
              </div>
            )}
            {displayImages.length > 1 && (
              <>
                <button
                  onClick={prevImg}
                  aria-label="Previous"
                  className="absolute left-5 top-1/2 -translate-y-1/2 text-foreground/80 hover:text-accent"
                >
                  <ChevronLeft className="h-6 w-6" strokeWidth={1} />
                </button>
                <button
                  onClick={nextImg}
                  aria-label="Next"
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-foreground/80 hover:text-accent"
                >
                  <ChevronRight className="h-6 w-6" strokeWidth={1} />
                </button>
              </>
            )}
            <div className="absolute bottom-5 right-5 text-xs tracking-[0.25em] text-muted-foreground">
              {imgIdx + 1}/{displayImages.length}
            </div>
          </div>

          {displayImages.length > 1 && (
            <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
              {displayImages.map((img, i) => (
                <button
                  key={img.src}
                  onClick={() => setImgIdx(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === imgIdx}
                  className="relative aspect-square w-20 shrink-0 overflow-hidden"
                  style={{
                    outline: i === imgIdx ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  <CatalogImage
                    image={{...img, alt: ''}}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="lg:sticky lg:top-28 lg:self-start">
          <Eyebrow>{product.collectionName}</Eyebrow>
          <h1
            className="font-display mt-5 text-4xl leading-tight md:text-5xl"
            style={{fontWeight: 400}}
          >
            {product.name}
          </h1>
          {product.reviews && (
            <p className="mt-3 text-sm text-muted-foreground">
              {product.reviews.rating.toFixed(1)} / 5 · {product.reviews.count}{' '}
              {product.reviews.count === 1 ? 'review' : 'reviews'}
            </p>
          )}
          <div className="mt-4 text-lg text-muted-foreground">{formatPrice(displayPrice)}</div>

          {product.options && product.options.length > 0 && (
            <div className="mt-8 space-y-6">
              {product.options.map((option) => (
                <div key={option.name}>
                  <div className="tracked text-muted-foreground">{option.name}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {option.values.map((value) => {
                      const active = selectedOptions[option.name] === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          onClick={() =>
                            setSelectedOptions((prev) => ({
                              ...prev,
                              [option.name]: value,
                            }))
                          }
                          className="border px-4 py-2 text-xs uppercase tracking-[0.2em] transition"
                          style={{
                            borderColor: active ? 'var(--accent)' : 'var(--border)',
                            color: active ? 'var(--accent)' : 'var(--foreground)',
                          }}
                        >
                          {value}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}

          {product.limited && (
            <div className="mt-6 flex items-center gap-3 text-[0.65rem] tracking-[0.3em] uppercase text-muted-foreground">
              <span style={{color: 'var(--accent)'}}>Limited Edition</span>
            </div>
          )}

          <div className="mt-12 space-y-3">
            {soldOut ? (
              <>
                <button
                  disabled
                  className="w-full py-4 tracked cursor-not-allowed"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--border)',
                    color: 'var(--muted-foreground)',
                  }}
                >
                  Sold Out
                </button>
                <Link
                  to="/concierge"
                  className="block w-full border py-4 text-center tracked transition hover:text-accent"
                  style={{borderColor: 'var(--accent)', color: 'var(--accent)'}}
                >
                  Commission a Similar Piece
                </Link>
              </>
            ) : isShopifyVariant ? (
              <>
                <CartForm
                  route="/cart"
                  inputs={{
                    lines: [{merchandiseId: activeVariantId!, quantity: 1}],
                  }}
                  action={CartForm.ACTIONS.LinesAdd}
                >
                  {(fetcher: FetcherWithComponents<unknown>) => (
                    <button
                      type="submit"
                      disabled={fetcher.state !== 'idle'}
                      className="w-full py-4 tracked transition disabled:opacity-70"
                      style={{
                        background: 'var(--accent)',
                        color: 'var(--background)',
                      }}
                    >
                      Add to Bag
                    </button>
                  )}
                </CartForm>
                <Link
                  to="/cart"
                  className="block w-full border py-4 text-center tracked transition hover:text-accent"
                  style={{borderColor: 'var(--border)'}}
                >
                  Buy Now
                </Link>
              </>
            ) : (
              <Link
                to="/concierge"
                className="block w-full py-4 text-center tracked transition hover:opacity-90"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--background)',
                }}
              >
                Inquire via Concierge
              </Link>
            )}
          </div>

          <div className="mt-12">
            <Accordion title="Description" defaultOpen>
              {product.description}
            </Accordion>
            <Accordion title="Product Details">
              <dl className="space-y-4 text-sm leading-relaxed">
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>100 × 200 cm / 40 × 79 inches</dd>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Weight</dt>
                  <dd>220 gms / 7.8 oz</dd>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Composition</dt>
                  <dd>100% Kashmir Pashmina Cashmere*</dd>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Weaving</dt>
                  <dd>Handloom · 4 to 7 days</dd>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Embroidery</dt>
                  <dd>Sozni Hand Embroidery · 4 to 5 months</dd>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Origin</dt>
                  <dd>Made in Kashmir, India</dd>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Product Code</dt>
                  <dd>MK-03-26-SP</dd>
                </div>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[120px_1fr] sm:gap-4">
                  <dt className="text-muted-foreground">Care</dt>
                  <dd>
                    Dry Clean Only
                    <div className="mt-3">
                      <Link
                        to="/care-guide"
                        className="tracked inline-flex items-center gap-2 text-[0.65rem] uppercase text-accent hover:opacity-80 transition"
                      >
                        Care Guide for each material{' '}
                        <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                      </Link>
                    </div>
                  </dd>
                </div>
              </dl>
            </Accordion>

            <Accordion title="Guarantees & Delivery">
              <div className="space-y-6 py-2">
                <div className="flex gap-4">
                  <div className="mt-0.5 text-accent">✦</div>
                  <div>
                    <div className="text-sm font-medium">Authenticity Guaranteed</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      No questions asked money back guarantee on all products.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-0.5 text-accent">✦</div>
                  <div>
                    <div className="text-sm font-medium">Ships in 24 Hours</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      International 5–10 days · India 2–5 working days.
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="mt-0.5 text-accent">✦</div>
                  <div>
                    <div className="text-sm font-medium">Free International Shipping</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      On all orders over $200, ships direct from Kashmir.
                    </div>
                  </div>
                </div>
              </div>
            </Accordion>
            <Hairline />
          </div>
        </div>
      </section>

      <section className="relative py-32 md:py-40" style={{background: 'var(--surface)'}}>
        <div className="mx-auto max-w-3xl px-6 text-center md:px-10">
          <Eyebrow>The Story</Eyebrow>
          <p
            className="font-display mt-10 text-2xl leading-[1.5] md:text-[2rem]"
            style={{fontWeight: 300, fontStyle: 'italic'}}
          >
            &ldquo;{product.story}&rdquo;
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-[1600px] px-6 py-24 md:px-10">
        <Reveal>
          <Eyebrow>The Collection Continues</Eyebrow>
          <h2 className="font-display mt-6 text-3xl md:text-5xl" style={{fontWeight: 400}}>
            <span style={{fontStyle: 'italic'}}>Continue the story.</span>
          </h2>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
          {related.map((p) => (
            <ProductTile key={p.handle} product={p} />
          ))}
        </div>
        <Reveal>
          <div className="mt-16 flex justify-center">
            <Link
              to={`/collections/${product.collectionSlug}`}
              className="group inline-flex w-full items-center justify-center gap-3 border border-accent px-10 py-4 text-center tracked text-accent transition hover:bg-accent hover:text-background sm:w-auto"
            >
              View All {product.collectionName}
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-1"
                strokeWidth={1}
              />
            </Link>
          </div>
        </Reveal>
      </section>

      {fullOpen && (
        <div
          ref={lightboxRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={`${product.name} — full screen gallery`}
          onClick={() => setFullOpen(false)}
          className="fixed inset-0 z-[100] flex flex-col outline-none md:flex-row"
          style={{background: 'rgba(8,16,15,0.97)'}}
        >
          <button
            onClick={() => setFullOpen(false)}
            aria-label="Close full screen"
            className="absolute right-5 top-5 z-10 flex h-10 w-10 items-center justify-center rounded-full border transition hover:text-accent"
            style={{borderColor: 'var(--border)', background: 'rgba(8,16,15,0.4)'}}
          >
            <X className="h-5 w-5" strokeWidth={1} />
          </button>

          {imgCount > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="no-scrollbar flex shrink-0 gap-3 overflow-x-auto border-t p-4 md:max-h-full md:w-28 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-t-0 md:border-r md:p-5 order-last md:order-first"
              style={{borderColor: 'var(--border)'}}
            >
              {displayImages.map((img, i) => (
                <button
                  key={img.src}
                  onClick={() => setImgIdx(i)}
                  aria-label={`View image ${i + 1}`}
                  aria-current={i === imgIdx}
                  className="relative aspect-square w-16 shrink-0 overflow-hidden transition md:w-full"
                  style={{
                    outline: i === imgIdx ? '1px solid var(--accent)' : '1px solid var(--border)',
                  }}
                >
                  <CatalogImage
                    image={{...img, alt: ''}}
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}

          <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 md:p-10">
            <CatalogImage
              image={displayImages[imgIdx]}
              onClick={(e) => e.stopPropagation()}
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain p-4 md:p-10"
            />
            {imgCount > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    prevImg();
                  }}
                  aria-label="Previous image"
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-foreground/80 hover:text-accent md:left-8"
                >
                  <ChevronLeft className="h-7 w-7" strokeWidth={1} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    nextImg();
                  }}
                  aria-label="Next image"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-foreground/80 hover:text-accent md:right-8"
                >
                  <ChevronRight className="h-7 w-7" strokeWidth={1} />
                </button>
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 text-xs tracking-[0.25em] text-muted-foreground">
                  {imgIdx + 1}/{imgCount}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
