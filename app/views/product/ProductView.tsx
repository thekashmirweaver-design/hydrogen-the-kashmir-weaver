import {Link, useFetcher, type FetcherWithComponents} from 'react-router';
import {lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {createPortal} from 'react-dom';
import {
  ChevronLeft,
  ChevronRight,
  ArrowRight,
  ZoomIn,
  X,
} from 'lucide-react';
import {CartForm, Analytics} from '@shopify/hydrogen';
import {Eyebrow, Hairline} from '~/components/gulriza/Eyebrow';
import {trackBeginCheckoutItems} from '~/components/GoogleAnalytics';
import {Accordion} from '~/components/gulriza/Accordion';
import {ProductTile} from '~/components/gulriza/ProductTile';
import {CatalogImage} from '~/components/gulriza/CatalogImage';
import {HorizontalScrollCue} from '~/components/gulriza/HorizontalScrollCue';
import {ShadeSwatch} from '~/components/gulriza/ShadeSwatch';
import {ShadeSwatchStack} from '~/components/gulriza/ShadeSwatchStack';
import {SelectedColourCard} from '~/components/gulriza/SelectedColourCard';
import {ProductOptionPicker} from '~/components/gulriza/ProductOptionPicker';
import {QuantityStepper} from '~/components/gulriza/QuantityStepper';
import {Reveal} from '~/components/gulriza/Reveal';
import {LegalRichHtml} from '~/components/gulriza/LegalRichHtml';
import type {Product, ProductVariant} from '~/models/types';
import {useFormatPrice} from '~/lib/currency-store';
import {
  maxCartQuantity,
  showQuantitySelector,
  UNTRACKED_MAX_QTY,
} from '~/lib/product-inventory';
import {
  formatOptionDisplay,
  getProductColor,
  isSizeOptionName,
} from '~/lib/parse-size-option';
import {useFocusTrap} from '~/hooks/use-focus-trap';
import {useHorizontalSwipe} from '~/hooks/use-horizontal-swipe';
import {lockScroll, unlockScroll} from '~/lib/scroll-lock';
import {getProductShades, getDefaultSolidShadeCode, isSolidProduct} from '~/lib/solid-product';
import {buildBuyNowShadeQuery, shadeCartAttributes} from '~/lib/shade-cart';
import {toCartSelectedVariant} from '~/lib/cart-selected-variant';
import {useCartDrawer} from '~/contexts/cart-drawer-context';

// Code-split the 750-line TryColoursModal. It only opens when the user
// taps "Try colours" on a Solid product; the modal portals to document.body
// and is closed by default, so the Suspense fallback stays invisible.
const TryColoursModal = lazy(() =>
  import('~/components/gulriza/TryColoursModal').then((m) => ({default: m.TryColoursModal})),
);

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
  const productColor = useMemo(
    () =>
      getProductColor(product.options, selectedVariant?.selectedOptions),
    [product.options, selectedVariant?.selectedOptions],
  );
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
  const productShades = useMemo(() => getProductShades(product), [product]);
  const defaultShadeCode = useMemo(
    () => getDefaultSolidShadeCode(productShades),
    [productShades],
  );
  const [selectedShadeCode, setSelectedShadeCode] = useState(defaultShadeCode);
  const [quantity, setQuantity] = useState(1);
  const [fullOpen, setFullOpen] = useState(false);
  const [tryColoursOpen, setTryColoursOpen] = useState(false);
  const [recolorImgIdx, setRecolorImgIdx] = useState(0);
  const lightboxRef = useRef<HTMLDivElement>(null);
  const formatPrice = useFormatPrice();
  const {open: openCartDrawer} = useCartDrawer();
  const addToBagFetcher = useFetcher({key: 'add-to-bag'});
  const wasAddingRef = useRef(false);
  useFocusTrap(fullOpen, lightboxRef);

  // After Add to Bag succeeds, open the cart drawer (and close Colour Studio if open).
  useEffect(() => {
    const busy =
      addToBagFetcher.state === 'submitting' ||
      addToBagFetcher.state === 'loading';
    if (busy) {
      wasAddingRef.current = true;
      return;
    }
    if (wasAddingRef.current && addToBagFetcher.state === 'idle') {
      wasAddingRef.current = false;
      if (tryColoursOpen) setTryColoursOpen(false);
      openCartDrawer();
    }
  }, [addToBagFetcher.state, tryColoursOpen, openCartDrawer]);

  useEffect(() => {
    setImgIdx(0);
    setQuantity(1);
  }, [selectedVariant?.id]);

  useEffect(() => {
    setImgIdx(0);
    setSelectedShadeCode(defaultShadeCode);
  }, [product.handle, defaultShadeCode]);

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
  const solidRecolor = isSolidProduct(product);
  const usesColourStudio = Boolean(
    product.showColourStudio && productShades.length > 0,
  );
  const selectedShade = useMemo(
    () =>
      productShades.find((shade) => shade.code === selectedShadeCode) ??
      productShades.find((shade) => shade.code === defaultShadeCode) ??
      productShades[0] ??
      null,
    [productShades, selectedShadeCode, defaultShadeCode],
  );
  const isShopifyVariant = isShopifyMerchandiseId(activeVariantId);
  const merchandiseGid = activeVariantId
    ? toMerchandiseGid(activeVariantId)
    : undefined;

  const imgCount = displayImages.length;
  const activeImage = displayImages[imgIdx] ?? displayImages[0];
  const selectImage = useCallback((i: number) => {
    setImgIdx(i);
  }, []);
  const prevImg = useCallback(() => {
    setImgIdx((i) => (i - 1 + imgCount) % imgCount);
  }, [imgCount]);
  const nextImg = useCallback(() => {
    setImgIdx((i) => (i + 1) % imgCount);
  }, [imgCount]);

  const gallerySwipe = useHorizontalSwipe({
    onSwipeLeft: nextImg,
    onSwipeRight: prevImg,
    enabled: imgCount > 1,
  });

  const lightboxSwipe = useHorizontalSwipe({
    onSwipeLeft: nextImg,
    onSwipeRight: prevImg,
    enabled: fullOpen && imgCount > 1,
  });

  const openColourStudio = useCallback(() => {
    setFullOpen(false);
    setTryColoursOpen(true);
  }, []);

  const buyNowQuantity = canChooseQuantity ? quantity : 1;
  const buyNowVariantId = activeVariantId?.replace(
    /^gid:\/\/shopify\/ProductVariant\//,
    '',
  );
  const shadeLineAttributes = useMemo(
    () => (usesColourStudio ? shadeCartAttributes(selectedShade) : []),
    [usesColourStudio, selectedShade],
  );
  const buyNowHref = useMemo(() => {
    if (!buyNowVariantId) return '/cart';
    const shadeQuery = buildBuyNowShadeQuery(
      usesColourStudio ? selectedShade : null,
    );
    const path = `/cart/${buyNowVariantId}:${buyNowQuantity}`;
    return shadeQuery ? `${path}?${shadeQuery}` : path;
  }, [buyNowVariantId, buyNowQuantity, usesColourStudio, selectedShade]);

  useEffect(() => {
    if (!fullOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullOpen(false);
      else if (e.key === 'ArrowLeft' && imgCount > 1) prevImg();
      else if (e.key === 'ArrowRight' && imgCount > 1) nextImg();
    };
    window.addEventListener('keydown', onKey);
    lockScroll();
    return () => {
      window.removeEventListener('keydown', onKey);
      unlockScroll();
    };
  }, [fullOpen, imgCount, nextImg, prevImg]);

  // Shared purchase actions — reused on the PDP and inside the colour studio so
  // the cart wiring (fetcherKey, shade attributes, quantity) lives in one place.
  const purchaseActions = soldOut ? (
    <>
      <button
        disabled
        className="btn-secondary w-full cursor-not-allowed py-3.5 tracked"
      >
        Sold Out
      </button>
      <Link
        to="/concierge"
        className="btn-secondary btn-secondary-accent block w-full py-3.5 text-center tracked touch-manipulation"
      >
        Commission a Similar Piece
      </Link>
    </>
  ) : isShopifyVariant ? (
    <>
      <CartForm
        fetcherKey="add-to-bag"
        route="/cart"
        inputs={{
          lines: [
            {
              merchandiseId: merchandiseGid!,
              quantity: canChooseQuantity ? quantity : 1,
              ...(selectedVariant
                ? {
                    selectedVariant: toCartSelectedVariant(
                      selectedVariant,
                      product,
                    ),
                  }
                : {}),
              ...(shadeLineAttributes.length
                ? {attributes: shadeLineAttributes}
                : {}),
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
        to={buyNowHref}
        reloadDocument
        onClick={() => {
          if (!activeVariantId) return;
          trackBeginCheckoutItems(
            [
              {
                item_id: activeVariantId.replace(
                  /^gid:\/\/shopify\/ProductVariant\//,
                  '',
                ),
                item_name: product.name,
                item_variant: selectedVariant?.title,
                item_brand: product.vendor,
                item_category: product.productType,
                price: displayPrice.amount,
                quantity: buyNowQuantity,
              },
            ],
            displayPrice.currencyCode,
            displayPrice.amount * buyNowQuantity,
          );
        }}
        className="btn-secondary block w-full py-3.5 text-center tracked touch-manipulation"
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
  );

  return (
    <div className={!soldOut && isShopifyVariant ? 'pb-24 lg:pb-0' : undefined}>
      {activeVariantId ? (
        <Analytics.ProductView
          data={{
            products: [
              {
                id: product.id,
                title: product.name,
                price: String(displayPrice.amount),
                vendor: product.vendor ?? '',
                variantId: toMerchandiseGid(activeVariantId),
                variantTitle: selectedVariant?.title ?? '',
                quantity: 1,
                sku: selectedSku,
                productType: product.productType,
              },
            ],
          }}
        />
      ) : null}
      <div className="mx-auto max-w-[1600px] px-6 pt-8 md:px-10">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tracking-[0.25em] text-muted-foreground uppercase">
          <Link to="/" className="inline-flex min-h-11 items-center hover:text-accent">
            Home
          </Link>
          <span>/</span>
          <Link to="/collections" className="inline-flex min-h-11 items-center hover:text-accent">
            Collections
          </Link>
          <span>/</span>
          <Link
            to={`/collections/${product.collectionSlug}`}
            className="inline-flex min-h-11 items-center hover:text-accent"
          >
            {product.collectionName}
          </Link>
        </div>
      </div>

      <section className="mx-auto max-w-[1200px] px-6 py-10 md:px-10 md:py-14">
        <div className="grid grid-cols-1 items-start gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] lg:gap-12">
          {/* Gallery */}
          <div className="mx-auto w-full min-w-0 lg:mx-0">
            <div className="flex flex-col gap-2 md:grid md:grid-cols-[auto_minmax(0,1fr)] md:items-start md:gap-2">
              <div
                className="group relative mx-auto w-fit max-w-full touch-pan-y select-none md:col-start-2 md:row-start-1"
                {...gallerySwipe}
              >
                <div key={imgIdx} className="gallery-image-fade relative">
                  <CatalogImage
                    image={activeImage!}
                    onClick={() => setFullOpen(true)}
                    className="h-full w-full max-h-[min(75dvh,720px)] cursor-zoom-in object-contain"
                    wrapperClassName="relative mx-auto w-auto max-h-[min(75dvh,720px)] max-w-full"
                    wrapperStyle={
                      activeImage?.width && activeImage?.height
                        ? {
                            aspectRatio: `${activeImage.width} / ${activeImage.height}`,
                            maxHeight: 'min(75dvh, 720px)',
                          }
                        : {aspectRatio: '4 / 5', maxHeight: 'min(75dvh, 720px)'}
                    }
                    loading="eager"
                    sizes="(min-width: 1024px) 55vw, 100vw"
                  />
                </div>
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-0 transition-opacity duration-200 group-hover:opacity-100 motion-reduce:opacity-0"
                  aria-hidden
                >
                  <span
                    className="flex h-12 w-12 items-center justify-center rounded-full border text-foreground/90"
                    style={{
                      borderColor: 'var(--border)',
                      background: 'var(--overlay-pill-bg)',
                    }}
                  >
                    <ZoomIn className="h-5 w-5" strokeWidth={1} />
                  </span>
                </div>

                {soldOut && (
                  <div
                    className="pointer-events-none absolute left-3 top-3 px-3 py-1 text-[0.65rem] tracking-[0.3em] uppercase md:left-4 md:top-4"
                    style={{
                      background: 'var(--sold-out-badge-bg)',
                      color: 'var(--accent)',
                      border: '1px solid var(--accent)',
                    }}
                  >
                    Sold Out
                  </div>
                )}
              </div>

              {imgCount > 1 && (
                <>
                  <div className="md:hidden">
                    <HorizontalScrollCue
                      cueLabel="Swipe"
                      className="flex gap-2 overflow-x-auto pb-1 no-scrollbar"
                    >
                    {displayImages.map((img, i) => (
                      <button
                        key={img.src}
                        onClick={() => selectImage(i)}
                        onMouseEnter={() => selectImage(i)}
                        onFocus={() => selectImage(i)}
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
                          wrapperClassName="absolute inset-0"
                          className="h-full w-full object-cover"
                        />
                      </button>
                    ))}
                    </HorizontalScrollCue>
                  </div>

                  <div className="hidden w-16 shrink-0 md:col-start-1 md:row-start-1 md:block lg:w-[4.5rem]">
                    <div className="flex max-h-[min(75dvh,720px)] flex-col gap-1.5 overflow-y-auto overscroll-contain">
                      {displayImages.map((img, i) => (
                        <button
                          key={img.src}
                          onClick={() => selectImage(i)}
                          onMouseEnter={() => selectImage(i)}
                          onFocus={() => selectImage(i)}
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
                            wrapperClassName="absolute inset-0"
                            className="h-full w-full object-cover"
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
              <span
                className="font-display text-xl md:text-2xl"
                style={{fontWeight: 400}}
              >
                {formatPrice(displayPrice)}
              </span>
            </div>
            {fixedSizeLabel ? (
              <p className="mt-2 text-sm text-muted-foreground">{fixedSizeLabel}</p>
            ) : null}

            <div className="mt-6 flex flex-col gap-4">
              {product.showColourStudio && productShades.length > 0 ? (
                <div className="space-y-3">
                  {selectedShade ? (
                    <SelectedColourCard shade={selectedShade} label="Colour" />
                  ) : null}
                  <button
                    type="button"
                    onClick={openColourStudio}
                    aria-label={`Try new colours on ${product.name}`}
                    className="btn-preview group w-full py-3.5 tracked touch-manipulation"
                  >
                    <span className="inline-flex items-center justify-center gap-3">
                      <ShadeSwatchStack shades={productShades} maxVisible={4} />
                      <span>Try new colours</span>
                    </span>
                  </button>
                  <p className="text-xs leading-relaxed text-muted-foreground">
                    Preview how each shade looks on this piece before you buy.
                  </p>
                </div>
              ) : null}
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

              <div className="space-y-2.5">{purchaseActions}</div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Authentic ·{' '}
                <Link to="/shipping" className="underline-offset-2 hover:text-accent hover:underline">
                  Free shipping over $200
                </Link>
                {' · '}
                <Link to="/returns" className="underline-offset-2 hover:text-accent hover:underline">
                  Easy returns
                </Link>
              </p>
            </div>

            <div className="mt-8">
              <Accordion title="Description" defaultOpen>
                <LegalRichHtml
                  html={product.description}
                  className="text-sm"
                />
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
              {usesColourStudio && selectedShade ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Colour</dt>
                  <dd>
                    <span className="inline-flex items-center gap-2">
                      <ShadeSwatch
                        hex={selectedShade.hex}
                        size="sm"
                        label={selectedShade.family}
                      />
                      {selectedShade.family} ({selectedShade.code})
                    </span>
                  </dd>
                </div>
              ) : productColor ? (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-[7rem_1fr] sm:gap-x-6 md:grid-cols-[8rem_1fr]">
                  <dt className="text-muted-foreground">Colour</dt>
                  <dd>{productColor}</dd>
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
          <Eyebrow>More from this collection</Eyebrow>
          <h2
            className="font-display mt-6 text-3xl md:text-5xl"
            style={{fontWeight: 400}}
          >
            More from {product.collectionName}
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
              View collection
              <ArrowRight
                className="h-4 w-4 transition group-hover:translate-x-1"
                strokeWidth={1}
              />
            </Link>
          </div>
        </Reveal>
      </section>

      {!soldOut && isShopifyVariant ? (
        <div
          className="fixed inset-x-0 bottom-0 z-40 border-t px-4 py-3 lg:hidden"
          style={{
            background: 'var(--background)',
            borderColor: 'var(--border)',
            paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))',
          }}
        >
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{product.name}</p>
              <p className="font-display text-lg leading-tight">
                {formatPrice(displayPrice)}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <CartForm
                fetcherKey="add-to-bag"
                route="/cart"
                inputs={{
                  lines: [
                    {
                      merchandiseId: merchandiseGid!,
                      quantity: canChooseQuantity ? quantity : 1,
                      ...(selectedVariant
                        ? {
                            selectedVariant: toCartSelectedVariant(
                              selectedVariant,
                              product,
                            ),
                          }
                        : {}),
                      ...(shadeLineAttributes.length
                        ? {attributes: shadeLineAttributes}
                        : {}),
                    },
                  ],
                }}
                action={CartForm.ACTIONS.LinesAdd}
              >
                {(fetcher: FetcherWithComponents<unknown>) => (
                  <button
                    type="submit"
                    disabled={fetcher.state !== 'idle'}
                    className="tracked px-4 py-3.5 text-[0.7rem] uppercase tracking-[0.1em] transition disabled:opacity-70 touch-manipulation"
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
                to={buyNowHref}
                reloadDocument
                onClick={() => {
                  if (!activeVariantId) return;
                  trackBeginCheckoutItems(
                    [
                      {
                        item_id: activeVariantId.replace(
                          /^gid:\/\/shopify\/ProductVariant\//,
                          '',
                        ),
                        item_name: product.name,
                        item_variant: selectedVariant?.title,
                        item_brand: product.vendor,
                        item_category: product.productType,
                        price: displayPrice.amount,
                        quantity: buyNowQuantity,
                      },
                    ],
                    displayPrice.currencyCode,
                    displayPrice.amount * buyNowQuantity,
                  );
                }}
                className="btn-secondary tracked px-4 py-3.5 text-center text-[0.7rem] uppercase tracking-[0.1em] touch-manipulation"
              >
                Buy Now
              </Link>
            </div>
          </div>
        </div>
      ) : null}

      {fullOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={lightboxRef}
              tabIndex={-1}
              role="dialog"
              aria-modal="true"
              aria-label={`${product.name} — full screen gallery`}
              onClick={() => setFullOpen(false)}
              className="fixed inset-0 z-[100] flex flex-col outline-none md:flex-row"
              style={{background: 'var(--gallery-backdrop)'}}
            >
              <button
                onClick={() => setFullOpen(false)}
                aria-label="Close full screen"
                className="touch-target absolute z-10 flex min-h-11 min-w-11 items-center justify-center rounded-full border transition hover:text-accent active:opacity-80"
                style={{
                  borderColor: 'var(--border)',
                  background: 'var(--gallery-close-bg)',
                  top: 'max(1.25rem, env(safe-area-inset-top))',
                  right: 'max(1.25rem, env(safe-area-inset-right))',
                }}
              >
                <X className="h-5 w-5" strokeWidth={1} />
              </button>

              {imgCount > 1 && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="no-scrollbar order-last flex shrink-0 gap-3 overflow-x-auto border-t p-4 md:order-first md:max-h-full md:w-28 md:flex-col md:overflow-x-hidden md:overflow-y-auto md:border-r md:border-t-0 md:p-5"
                  style={{
                    borderColor: 'var(--border)',
                    paddingBottom: 'max(1rem, env(safe-area-inset-bottom))',
                  }}
                >
                  {displayImages.map((img, i) => (
                    <button
                      key={img.src}
                      onClick={() => selectImage(i)}
                      onMouseEnter={() => selectImage(i)}
                      onFocus={() => selectImage(i)}
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
                        wrapperClassName="absolute inset-0"
                        className="h-full w-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}

              <div
                className="relative flex min-h-0 flex-1 touch-pan-y select-none items-center justify-center p-4 md:p-10"
                {...lightboxSwipe}
              >
                <div key={imgIdx} className="gallery-image-fade flex h-full w-full items-center justify-center">
                  <CatalogImage
                    image={activeImage!}
                    onClick={(e) => e.stopPropagation()}
                    className="max-h-full max-w-full object-contain"
                    wrapperClassName="flex h-full w-full items-center justify-center"
                    loading="eager"
                    sizes="100vw"
                  />
                </div>
                {imgCount > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        prevImg();
                      }}
                      aria-label="Previous image"
                      className="touch-target absolute left-4 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-foreground/80 hover:text-accent active:opacity-80 md:left-8"
                    >
                      <ChevronLeft className="h-7 w-7" strokeWidth={1} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        nextImg();
                      }}
                      aria-label="Next image"
                      className="touch-target absolute right-4 top-1/2 flex min-h-11 min-w-11 -translate-y-1/2 items-center justify-center text-foreground/80 hover:text-accent active:opacity-80 md:right-8"
                    >
                      <ChevronRight className="h-7 w-7" strokeWidth={1} />
                    </button>
                    <div
                      className="absolute left-1/2 -translate-x-1/2 text-xs tracking-[0.25em] text-muted-foreground"
                      style={{bottom: 'max(1.25rem, env(safe-area-inset-bottom))'}}
                    >
                      {imgIdx + 1}/{imgCount}
                    </div>
                  </>
                )}
              </div>
            </div>,
            document.body,
          )
        : null}

      {tryColoursOpen && solidRecolor && productShades.length > 0 ? (
        <Suspense fallback={null}>
          <TryColoursModal
            open={tryColoursOpen}
            onClose={() => setTryColoursOpen(false)}
            productName={product.name}
            shades={productShades}
            selectedCode={selectedShadeCode}
            onSelectShade={setSelectedShadeCode}
            imageIdx={recolorImgIdx}
            onImageIdxChange={setRecolorImgIdx}
            priceLabel={formatPrice(displayPrice)}
            purchaseControls={purchaseActions}
          />
        </Suspense>
      ) : null}
    </div>
  );
}
