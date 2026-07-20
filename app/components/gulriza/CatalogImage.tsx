import type {CSSProperties, MouseEvent, ImgHTMLAttributes} from 'react';
import {useEffect, useRef, useState} from 'react';
import {Image} from '@shopify/hydrogen';
import type {ProductImage} from '~/models/types';

type CatalogImageProps = {
  image: ProductImage;
  className?: string;
  wrapperClassName?: string;
  wrapperStyle?: CSSProperties;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent) => void;
  onMouseMove?: (e: MouseEvent) => void;
  onMouseLeave?: (e: MouseEvent) => void;
  showSkeleton?: boolean;
  srcSet?: string;
  /** LCP / above-fold: no opacity hide, eager + high fetchPriority by default. */
  priority?: boolean;
};

function isShopifyCdn(src: string) {
  return src.includes('cdn.shopify.com');
}

/**
 * Strip the size parameters Shopify appends to CDN URLs (`width=`,
 * `height=`, `crop=`). Hydrogen's `<Image>` regenerates these per
 * srcset variant — leaving them on the source URL bakes a 1000-px
 * default into the `src` and forces browsers to fetch the largest
 * variant even when `sizes` points to a smaller slot.
 */
function normalizeShopifyCdnUrl(src: string): string {
  if (!isShopifyCdn(src)) return src;
  try {
    const url = new URL(src);
    if (!url.searchParams.has('width')) return src;
    url.searchParams.delete('width');
    url.searchParams.delete('height');
    url.searchParams.delete('crop');
    return url.toString();
  } catch {
    return src;
  }
}

/** Uses Hydrogen Image for Shopify CDN URLs; plain img for local /public assets. */
export function CatalogImage({
  image,
  className = '',
  wrapperClassName = '',
  wrapperStyle,
  loading: loadingProp,
  fetchPriority: fetchPriorityProp,
  sizes = '(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw',
  style,
  onClick,
  onMouseMove,
  onMouseLeave,
  showSkeleton: showSkeletonProp,
  srcSet,
  priority = false,
}: CatalogImageProps) {
  const loading = loadingProp ?? (priority ? 'eager' : 'lazy');
  const fetchPriority =
    fetchPriorityProp ?? (priority ? 'high' : undefined);
  const showSkeleton = showSkeletonProp ?? !priority;
  const [loaded, setLoaded] = useState(priority);
  const imgRef = useRef<HTMLImageElement>(null);
  const decoding = loading === 'eager' ? 'sync' : 'async';

  useEffect(() => {
    if (priority) {
      setLoaded(true);
      return;
    }
    setLoaded(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [image.src, priority]);

  const imageStyle: CSSProperties = {
    ...style,
    // Priority images paint immediately — opacity:0 until onLoad delays LCP.
    opacity: priority || loaded ? 1 : 0,
    transition: [
      style?.transition,
      priority ? undefined : 'opacity 320ms ease-out',
    ]
      .filter(Boolean)
      .join(', ') || undefined,
  };

  const inner = isShopifyCdn(image.src) ? (
    <Image
      ref={imgRef}
      data={{
        url: normalizeShopifyCdnUrl(image.src),
        altText: image.alt,
        width: image.width ?? 1200,
        height: image.height ?? 1500,
      }}
      className={className}
      loading={loading}
      sizes={sizes}
      style={imageStyle}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      onLoad={() => setLoaded(true)}
      // React 18: Hydrogen Image forwards unknown props onto <img>; camelCase
      // fetchPriority warns — use the HTML attribute name.
      {...(fetchPriority
        ? ({fetchpriority: fetchPriority} as ImgHTMLAttributes<HTMLImageElement>)
        : {})}
    />
  ) : (
    <img
      ref={imgRef}
      src={image.src}
      alt={image.alt}
      className={className}
      loading={loading}
      decoding={decoding}
      onLoad={() => setLoaded(true)}
      {...(fetchPriority ? {fetchpriority: fetchPriority} : {})}
      style={imageStyle}
      onClick={onClick}
      onMouseMove={onMouseMove}
      onMouseLeave={onMouseLeave}
      width={image.width}
      height={image.height}
      {...(srcSet ? {srcSet} : {})}
    />
  );

  if (!showSkeleton) return inner;

  return (
    <span
      className={`relative block h-full w-full ${wrapperClassName}`.trim()}
      style={wrapperStyle}
    >
      {!loaded ? (
        <span
          className="image-skeleton absolute inset-0"
          aria-hidden
        />
      ) : null}
      {inner}
    </span>
  );
}

/** Hero / editorial image with responsive Shopify srcset when on CDN. */
export function EditorialImage({
  src,
  alt,
  width,
  height,
  className,
  wrapperClassName,
  loading = 'lazy',
  fetchPriority,
  sizes = '100vw',
  style,
  showSkeleton = true,
  srcSet,
  priority = false,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  wrapperClassName?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  style?: CSSProperties;
  showSkeleton?: boolean;
  srcSet?: string;
  priority?: boolean;
}) {
  return (
    <CatalogImage
      image={{src, alt, width, height}}
      className={className}
      wrapperClassName={wrapperClassName}
      loading={loading}
      fetchPriority={fetchPriority}
      sizes={sizes}
      style={style}
      showSkeleton={showSkeleton}
      srcSet={srcSet}
      priority={priority}
    />
  );
}

/**
 * Hero picture: AVIF → WebP → JPG. Paths should exist as a set on the same
 * origin (e.g. /assets/hero-portrait.{avif,webp,jpg}). Preload the preferred
 * format from the document head for LCP.
 */
export function HeroPicture({
  jpg,
  jpgSmall,
  webp,
  webpSmall,
  avif,
  avifSmall,
  alt,
  width,
  height,
  className = '',
  sizes = '100vw',
  loading = 'eager',
  fetchPriority = 'high',
  style,
}: {
  jpg: string;
  jpgSmall?: string;
  webp?: string;
  webpSmall?: string;
  avif?: string;
  avifSmall?: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  loading?: 'lazy' | 'eager';
  fetchPriority?: 'high' | 'low' | 'auto';
  style?: CSSProperties;
}) {
  const jpgSrcSet = jpgSmall ? `${jpgSmall} 800w, ${jpg} 1536w` : `${jpg} 1536w`;
  const webpSrcSet =
    webp && webpSmall
      ? `${webpSmall} 800w, ${webp} 1536w`
      : webp
        ? `${webp} 1536w`
        : undefined;
  const avifSrcSet =
    avif && avifSmall
      ? `${avifSmall} 800w, ${avif} 1536w`
      : avif
        ? `${avif} 1536w`
        : undefined;

  return (
    <picture>
      {avifSrcSet ? (
        <source type="image/avif" srcSet={avifSrcSet} sizes={sizes} />
      ) : null}
      {webpSrcSet ? (
        <source type="image/webp" srcSet={webpSrcSet} sizes={sizes} />
      ) : null}
      <img
        src={jpg}
        srcSet={jpgSrcSet}
        sizes={sizes}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        decoding={loading === 'eager' ? 'sync' : 'async'}
        // React 18 DOM: camelCase fetchPriority is not recognized.
        fetchpriority={fetchPriority}
        className={className}
        style={style}
      />
    </picture>
  );
}

/** Carousel / grid product tile sizes — matches ProductCarousel slot widths. */
export const PRODUCT_TILE_SIZES =
  '(min-width: 1280px) 300px, (min-width: 1024px) 280px, (min-width: 768px) 32vw, (min-width: 640px) 50vw, 85vw';

export const PRODUCT_GRID_SIZES =
  '(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw';
