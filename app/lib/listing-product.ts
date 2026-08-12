import {extractProductColors} from '~/lib/catalog-colors';
import type {Product} from '~/models/types';

/**
 * Strip PDP-only fields before serializing products into SSR/stream payloads.
 * Listing tiles keep identity, price, stock, colours, inquire flags, and a couple of images.
 */
export function toListingProduct(product: Product, maxImages = 2): Product {
  const colors =
    product.colors ??
    extractProductColors(product);
  return {
    id: product.id,
    variantId: product.variantId,
    handle: product.handle,
    name: product.name,
    collectionSlug: product.collectionSlug,
    collectionName: product.collectionName,
    allCollections: product.allCollections,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    shortDescription: product.shortDescription,
    description: '',
    story: '',
    images: product.images.slice(0, Math.max(1, maxImages)),
    material: product.material,
    origin: product.origin,
    weave: product.weave,
    stock: product.stock,
    limited: product.limited,
    stockQty: product.stockQty,
    department: product.department,
    vendor: product.vendor,
    tags: product.tags,
    createdAt: product.createdAt,
    publishedAt: product.publishedAt,
    reviews: product.reviews,
    ...(colors.length ? {colors} : {}),
    ...(product.requestPrice ? {requestPrice: true} : {}),
    ...(product.requestMoreImages ? {requestMoreImages: true} : {}),
  };
}

export function toListingProducts(
  products: Product[],
  maxImages = 2,
): Product[] {
  return products.map((product) => toListingProduct(product, maxImages));
}
