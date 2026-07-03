import type {CSSProperties, MouseEvent} from 'react';
import {Image} from '@shopify/hydrogen';
import type {ProductImage} from '~/models/types';

type CatalogImageProps = {
  image: ProductImage;
  className?: string;
  loading?: 'eager' | 'lazy';
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
  sizes = '(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw',
  style,
  onClick,
}: CatalogImageProps) {
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
      />
    );
  }

  return (
    <img
      src={image.src}
      alt={image.alt}
      className={className}
      loading={loading}
      style={style}
      onClick={onClick}
      width={image.width}
      height={image.height}
    />
  );
}
