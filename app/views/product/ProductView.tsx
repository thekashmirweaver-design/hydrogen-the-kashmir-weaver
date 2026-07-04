import {Link, type FetcherWithComponents} from 'react-router';
import {useEffect, useMemo, useRef, useState} from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  Expand,
  X,
} from 'lucide-react';
import {CartForm} from '@shopify/hydrogen';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {Accordion} from '~/components/gulriza/Accordion';
import {ProductTile} from '~/components/gulriza/ProductTile';
import {CatalogImage} from '~/components/gulriza/CatalogImage';
import {ProductOptionPicker} from '~/components/gulriza/ProductOptionPicker';
import {QuantityStepper} from '~/components/gulriza/QuantityStepper';
import {Reveal} from '~/components/gulriza/Reveal';
import type {Product, ProductVariant} from '~/models/types';
import {useFormatPrice} from '~/lib/currency-store';
import {
  maxCartQuantity,
  showQuantitySelector,
  UNTRACKED_MAX_QTY,
} from '~/lib/product-inventory';
import {formatOptionDisplay, isSizeOptionName} from '~/lib/parse-size-option';
import {useFocusTrap} from '~/hooks/use-focus-trap';

function isShopifyMerchandiseId(id?: string): boolean {
  if (!id) return false;
  if (id.startsWith('gid://shopify/ProductVariant/')) return true;
  return /^\d+$/.test(id);
}

function toMerchandiseGid(id: string): string {
  if (id.startsWith('gid://shopify/ProductVariant/')) return id;
  return `gid://shopify/ProductVariant/${id}`;
}

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
  const displayCompareAtPrice =
    selectedVariant?.compareAtPrice ?? product.compareAtPrice;
  const onSale =
    displayCompareAtPrice != null &&
    displayCompareAtPrice.amount > displayPrice.amount;
  const selectedSize = selectedVariant?.selectedOptions.find((o) =>
    /size/i.test(o.name),
  )?.value;
  const selectedWeight = selectedVariant?.weightLabel;
  const selectedSku = selectedVariant?.sku;
  const displayImages = useMemo(() => {
    if (selectedVariant?.image) {
      const rest = product.images.filter(
        (i) => i.src !== selectedVariant.image!.src,
      );
      return [selectedVariant.image, ...rest];
    }
    return product.images;
  }, [product.images, selectedVariant?.image]);

  const [imgIdx, setImgIdx] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [fullOpen, setFullOpen] = useState(false);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const formatPrice = useFormatPrice();
  useFocusTrap(fullOpen, lightboxRef);

  useEffect(() => {
    setImgIdx(0);
    setQuantity(1);
  }, [selectedVariant?.id]);

  const canChooseQuantity = showQuantitySelector(selectedVariant);
  const maxQuantity = maxCartQuantity(selectedVariant);
  const quantityHint =
    canChooseQuantity && maxQuantity < UNTRACKED_MAX_QTY
      ? `Max ${maxQuantity} per order`
      : undefined;

  const choosableOptions = useMemo(
    () => (product.options ?? []).filter((option) => option.values.length > 1),
    [product.options],
  );

  const fixedSizeLabel = useMemo(() => {
    const sizeOption = (product.options ?? []).find(
      (option) => isSizeOptionName(option.name) && option.values.length === 1,
    );
    if (!sizeOption) return null;
    return formatOptionDisplay(sizeOption.values[0]!, true);
  }, [product.options]);

  const soldOut =
    selectedVariant != null
      ? !selectedVariant.availableForSale
      : product.stock === 'out';
  const isShopifyVariant = isShopifyMerchandiseId(activeVariantId);
  const merchandiseGid = activeVariantId
    ? toMerchandiseGid(activeVariantId)
    : undefined;

  const imgCount = displayImages.length;
  const prevImg = () => setImgIdx((i) => (i - 1 + imgCount) % imgCount);
  const nextImg = () => setImgIdx((i) => (i + 1) % imgCount);

  const buyNowQuantity = canChooseQuantity ? quantity : 1;
  const buyNowVariantId = activeVariantId?.replace(
    /^gid:\/\/shopify\/ProductVariant\//,
    '',
  );

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
          <Link
            to={`/collections/${product.collectionSlug}`}
            className="hover:text-accent"
          >
            {product.collectionName}
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-[1200px] px-6 py-10 md:px-10 md:py-14">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:items-stretch lg:gap-12">
          {/* Gallery */}
          <div className="mx-auto w-full max-w-sm min-w-0 lg:mx-0 lg:h-full lg:max-w-none lg:self-stretch">
            <div className="flex h-full min-h-0 flex-col gap-2 md:grid md:grid-cols-[auto_1fr] md:gap-2">
              <div
                className="relative aspect-[4/5] min-h-0 min-w-0 overflow-hidden md:col-start-2 md:row-start-1 lg:aspect-auto lg:h-full"
                style={{background: 'var(--surface)'}}
              >
                <CatalogImage
                  image={displayImages[imgIdx]}
                  onClick={() => setFullOpen(true)}
                  className="absolute inset-0 h-full w-full cursor-zoom-in object-cover"
                  loading="eager"
                />
                <div className="pointer-events-none absolute inset-0 vignette-overlay" />
                <button
                  aria-label="View full screen"
                  onClick={() => setFullOpen(true)}
                  className="absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border transition hover:text-accent md:right-4 md:top-4"
                  style={{
                    borderColor: 'var(--border)',
                    background: 'rgba(8,16,15,0.4)',
                  }}
                >
                  <Expand className="h-4 w-4" strokeWidth={1} />
                </button>

                {soldOut && (
                  <div
                    className="absolute left-3 top-3 px-3 py-1 text-[0.65rem] tracking-[0.3em] uppercase md:left-4 md:top-4"
                    style={{
                      background: 'rgba(8,16,15,0.7)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                    }}
                  >
                    Sold Out
                  </div>
                )}
                {displayImages.length > 1 && (
                  <>
                    <button
                      onClick={prevImg}
                      aria-label="Previous"
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-foreground/80 hover:text-accent md:left-4"
                    >
                      <ChevronLeft className="h-5 w-5" strokeWidth={1} />
                    </button>
                    <button
                      onClick={nextImg}
                      aria-label="Next"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/80 hover:text-accent md:right-4"
                    >
                      <ChevronRight className="h-5 w-5" strokeWidth={1} />
                    </button>
                  </>
                )}
                <div className="absolute bottom-3 right-3 text-xs tracking-[0.25em] text-muted-foreground md:bottom-4 md:right-4">
                  {imgIdx + 1}/{displayImages.length}
                </div>
              </div>

              {displayImages.length > 1 && (
                <>
                  <div className="flex gap-2 overflow-x-auto pb-1 md:hidden">
                    {displayImages.map((img, i) => (
                      <button
                        key={img.src}
                        onClick={() => setImgIdx(i)}
                        aria-label={`View image ${i + 1}`}
                        aria-current={i === imgIdx}
                        className="relative aspect-square w-[4.5rem] shrink-0 overflow-hidden"
                        style={{
                          outline:
                            i === imgIdx
                              ? '1px solid var(--accent)'
                              : '1px solid var(--border)',
                        }}
                      >
                        <CatalogImage
                          image={{...img, alt: ''}}
                          className="absolute inset-0 h-full w-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  <div className="relative hidden w-16 shrink-0 self-stretch md:col-start-1 md:row-start-1 md:block lg:w-[4.5rem]">
                    <div className="absolute inset-0 flex flex-col gap-1.5 overflow-y-auto overscroll-contain">
                      {displayImages.map((img, i) => (
                        <button
                          key={img.src}
                          onClick={() => setImgIdx(i)}
                          aria-label={`View image ${i + 1}`}
                          aria-current={i === imgIdx}
                          className="relative aspect-square w-full shrink-0 overflow-hidden"
                          style={{
                            outline:
                              i === imgIdx
                                ? '1px solid var(--accent)'
                                : '1px solid var(--border)',
                          }}
                        >
                          <CatalogImage
                            image={{...img, alt: ''}}
                            className="absolute inset-0 h-full w-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Purchase */}
          <div className="min-w-0 lg:sticky lg:top-28 lg:self-start">
            <Eyebrow>{product.collectionName}</Eyebrow>
            <h1
              className="font-display mt-4 text-3xl leading-tight md:text-4xl"
              style={{fontWeight: 400}}
            >
              {product.name}
            </h1>
            {product.reviews && (
              <p className="mt-2 text-sm text-muted-foreground">
                {product.reviews.rating.toFixed(1)} / 5 · {product.reviews.count}{' '}
                {product.reviews.count === 1 ? 'review' : 'reviews'}
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
              {onSale && (
                <span className="text-base text-muted-foreground line-through">
                  {formatPrice(displayCompareAtPrice!)}
                </span>
              )}
              <span className="text-base text-muted-foreground">
                {formatPrice(displayPrice)}
              </span>
            </div>
            {fixedSizeLabel ? (
              <p className="mt-2 text-sm text-muted-foreground">{fixedSizeLabel}</p>
            ) : null}

            <div className="mt-6 flex flex-col gap-4">
              {choosableOptions.map((option) => (
                <ProductOptionPicker
                  key={option.name}
                  name={option.name}
                  values={option.values}
                  selected={selectedOptions[option.name] ?? ''}
                  onSelect={(value) =>
                    setSelectedOptions((prev) => ({
                      ...prev,
                      [option.name]: value,
                    }))
                  }
                />
              ))}
              {canChooseQuantity ? (
                <QuantityStepper
                  quantity={quantity}
                  max={maxQuantity}
                  onDecrease={() => setQuantity((q) => Math.max(1, q - 1))}
                  onIncrease={() =>
                    setQuantity((q) => Math.min(maxQuantity, q + 1))
                  }
                  hint={quantityHint}
                />
              ) : null}

              <div className="space-y-2.5">
                {soldOut ? (
                  <>
                    <button
                      disabled
                      className="w-full cursor-not-allowed py-3.5 tracked"
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
                      className="block w-full border py-3.5 text-center tracked transition hover:text-accent"
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
                        lines: [
                          {
                            merchandiseId: merchandiseGid!,
                            quantity: canChooseQuantity ? quantity : 1,
                          },
                        ],
                      }}
                      action={CartForm.ACTIONS.LinesAdd}
                    >
                      {(fetcher: FetcherWithComponents<unknown>) => (
                        <button
                          type="submit"
                          disabled={fetcher.state !== 'idle'}
                          className="w-full py-3.5 tracked transition disabled:opacity-70"
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
                      to={
                        buyNowVariantId
                          ? `/cart/${buyNowVariantId}:${buyNowQuantity}`
                          : '/cart'
                      }
                      className="block w-full border py-3.5 text-center tracked transition hover:text-accent"
                      style={{borderColor: 'var(--border)'}}
                    >
                      Buy Now
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/concierge"
                    className="block w-full py-3.5 text-center tracked transition hover:opacity-90"
                    style={{
                      background: 'var(--accent)',
                      color: 'var(--background)',
                    }}
                  >
                    Inquire via Concierge
                  </Link>
                )}
              </div>
            </div>

            <div className="mt-8">
              <Accordion title="Description" defaultOpen>
                {product.description}
              </Accordion>
            </div>
          </div>
        </div>

        {/* Details — full width below */}
        <div
          className="mt-12 space-y-12 border-t pt-10"
          style={{borderColor: 'var(--border)'}}
        >
          <section>
            <Eyebrow className="block">Product Details</Eyebrow>
            <dl className="mt-6 space-y-4 text-sm leading-relaxed">
              {selectedSize ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Size</dt>
                  <dd>{selectedSize}</dd>
                </div>
              ) : null}
              {product.material ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Composition</dt>
                  <dd>{product.material}</dd>
                </div>
              ) : null}
              {product.weave ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Weaving</dt>
                  <dd>{product.weave}</dd>
                </div>
              ) : null}
              {product.origin ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Origin</dt>
                  <dd>{product.origin}</dd>
                </div>
              ) : null}
              {selectedWeight ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Weight</dt>
                  <dd>{selectedWeight}</dd>
                </div>
              ) : null}
              {selectedSku ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Product Code</dt>
                  <dd>{selectedSku}</dd>
                </div>
              ) : null}
              {product.allCollections && product.allCollections.length > 1 ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Collections</dt>
                  <dd className="flex flex-wrap gap-x-3 gap-y-1">
                    {product.allCollections.map((c) => (
                      <Link
                        key={c.handle}
                        to={`/collections/${c.handle}`}
                        className="text-accent transition hover:opacity-80"
                      >
                        {c.name}
                      </Link>
                    ))}
                  </dd>
                </div>
              ) : null}
              {product.care ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Care</dt>
                  <dd>
                    {product.care}
                    <div className="mt-3">
                      <Link
                        to="/care-guide"
                        className="tracked inline-flex items-center gap-2 text-[0.65rem] uppercase text-accent transition hover:opacity-80"
                      >
                        Care Guide for each material{' '}
                        <ArrowRight className="h-3 w-3" strokeWidth={1.5} />
                      </Link>
                    </div>
                  </dd>
                </div>
              ) : null}
            </dl>
          </section>

          {product.guaranteesDelivery && product.guaranteesDelivery.length > 0 ? (
            <section>
              <Hairline />
              <Eyebrow className="mt-8 block">Guarantees & Delivery</Eyebrow>
              <div className="mt-6 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {product.guaranteesDelivery.map((item) => (
                  <div key={item.title} className="flex gap-4">
                    <div className="mt-0.5 shrink-0 text-accent">✦</div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        {item.body}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          {product.returnsCare && product.returnsCare.length > 0 ? (
            <section>
              <Hairline />
              <Eyebrow className="mt-8 block">Returns & Care</Eyebrow>
              <ul className="mt-6 space-y-4 text-sm leading-relaxed sm:max-w-2xl">
                {product.returnsCare.map((item) => (
                  <li key={item.text} className="flex gap-3">
                    <span className="mt-0.5 shrink-0 text-accent">✦</span>
                    {item.href ? (
                      <Link
                        to={item.href}
                        className="text-accent transition hover:opacity-80"
                      >
                        {item.text}
                      </Link>
                    ) : (
                      <span>{item.text}</span>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </div>
      </section>

      <section
        className="relative py-32 md:py-40"
        style={{background: 'var(--surface)'}}
      >
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
          <h2
            className="font-display mt-6 text-3xl md:text-5xl"
            style={{fontWeight: 400}}
          >
            <span style={{fontStyle: 'italic'}}>Continue the story.</span>
          </h2>
        </Reveal>
        <div className="mt-16 grid grid-cols-1 gap-x-8 gap-y-20 sm:grid-cols-2 lg:grid-cols-3">
          {relatedProducts.map((p) => (
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
            style={{
              borderColor: 'var(--border)',
              background: 'rgba(8,16,15,0.4)',
            }}
          >
            <X className="h-5 w-5" strokeWidth={1} />
          </button>

          {imgCount > 1 && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="no-scrollbar order-last flex shrink-0 gap-3 overflow-x-auto border-t p-4 md:order-first md:max-h-full md:w-28 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-t-0 md:p-5"
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
                    outline:
                      i === imgIdx
                        ? '1px solid var(--accent)'
                        : '1px solid var(--border)',
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
