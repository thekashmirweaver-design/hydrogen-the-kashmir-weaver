import type {CSSProperties, MouseEvent} from 'react';
import {Image} from '@shopify/hydrogen';
import type {ProductImage} from '~/models/types';

type CatalogImageProps = {
  image: ProductImage;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  style?: CSSProperties;
  onClick?: (e: MouseEvent) => void;
};

function isShopifyCdn(src: string) {
  return src.includes('cdn.shopify.com');
}

/** Uses Hydrogen Image for Shopify CDN URLs; plain img for local /public assets. */
export function CatalogImage({
  image,
  className,
  loading = 'lazy',
  fetchPriority,
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  style,
  onClick,
}: CatalogImageProps) {
  const decoding = loading === 'eager' ? 'sync' : 'async';

  if (isShopifyCdn(image.src)) {
    return (
      <Image
        data={{
          url: image.src,
          altText: image.alt,
          width: image.width ?? 1200,
          height: image.height ?? 1500,
        }}
        className={className}
        loading={loading}
        sizes={sizes}
        style={style}
        onClick={onClick}
        {...(fetchPriority ? {fetchPriority} : {})}
      />
    );
  }

  return (
    <img
      src={image.src}
      alt={image.alt}
      className={className}
      loading={loading}
      decoding={decoding}
      {...(fetchPriority ? {fetchPriority} : {})}
      style={style}
      onClick={onClick}
      width={image.width}
      height={image.height}
    />
  );
}

/** Hero / editorial image with responsive Shopify srcset when on CDN. */
export function EditorialImage({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority,
  sizes = '100vw',
  style,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  style?: CSSProperties;
}) {
  return (
    <CatalogImage
      image={{src, alt}}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      sizes={sizes}
      style={style}
    />
  );
}
