import type {Product, ProductVariant} from '~/models/types';

function toMerchandiseGid(id: string): string {
  if (id.startsWith('gid://shopify/ProductVariant/')) return id;
  return `gid://shopify/ProductVariant/${id}`;
}

/** Shape expected by Hydrogen `useOptimisticCart` for LinesAdd. */
export function toCartSelectedVariant(
  variant: ProductVariant,
  product: Product,
) {
  const image = variant.image ?? product.images[0];

  return {
    id: toMerchandiseGid(variant.id),
    title: variant.title,
    availableForSale: variant.availableForSale,
    price: {
      amount: String(variant.price.amount),
      currencyCode: variant.price.currencyCode,
    },
    compareAtPrice: variant.compareAtPrice
      ? {
          amount: String(variant.compareAtPrice.amount),
          currencyCode: variant.compareAtPrice.currencyCode,
        }
      : undefined,
    product: {
      handle: product.handle,
      title: product.name,
      ...(product.id.startsWith('gid://') ? {id: product.id} : {}),
    },
    image: image
      ? {
          url: image.src,
          altText: image.alt,
          ...(image.width != null ? {width: image.width} : {}),
          ...(image.height != null ? {height: image.height} : {}),
        }
      : undefined,
    selectedOptions: variant.selectedOptions,
  };
}
