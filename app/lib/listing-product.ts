import type {Product} from '~/models/types';

/**
 * Strip PDP-only fields before serializing products into SSR/stream payloads.
 * Listing tiles only need identity, price, stock, and a couple of images.
 */
export function toListingProduct(product: Product, maxImages = 2): Product {
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
    productType: product.productType,
    vendor: product.vendor,
    tags: product.tags,
    createdAt: product.createdAt,
    publishedAt: product.publishedAt,
    reviews: product.reviews,
  };
}

export function toListingProducts(
  products: Product[],
  maxImages = 2,
): Product[] {
  return products.map((product) => toListingProduct(product, maxImages));
}
