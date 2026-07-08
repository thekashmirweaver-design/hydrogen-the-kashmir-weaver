import type {CSSProperties, MouseEvent} from 'react';
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
  showSkeleton?: boolean;
  srcSet?: string;
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
  loading = 'lazy',
  fetchPriority,
  sizes = '(min-width: 1024px) 280px, (min-width: 640px) 50vw, 100vw',
  style,
  onClick,
  showSkeleton = true,
  srcSet,
}: CatalogImageProps) {
  const [loaded, setLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const decoding = loading === 'eager' ? 'sync' : 'async';

  useEffect(() => {
    setLoaded(false);
    const img = imgRef.current;
    if (img?.complete && img.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [image.src]);

  const imageStyle: CSSProperties = {
    ...style,
    opacity: loaded ? 1 : 0,
    transition: 'opacity 320ms ease-out',
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
      onLoad={() => setLoaded(true)}
      {...(fetchPriority ? {fetchPriority} : {})}
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
      {...(fetchPriority ? {fetchPriority} : {})}
      style={imageStyle}
      onClick={onClick}
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
  loading = 'lazy',
  fetchPriority,
  sizes = '100vw',
  style,
  showSkeleton = true,
  srcSet,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  style?: CSSProperties;
  showSkeleton?: boolean;
  srcSet?: string;
}) {
  return (
    <CatalogImage
      image={{src, alt, width, height}}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      sizes={sizes}
      style={style}
      showSkeleton={showSkeleton}
      srcSet={srcSet}
    />
  );
}
