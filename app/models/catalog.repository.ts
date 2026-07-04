import type {Storefront} from '@shopify/hydrogen';
import type {CatalogSnapshot, Collection, Product} from './types';
import * as ShopifyRepository from './shopify/repository';
import * as StaticRepository from './static/repository';
import {withDummyTestProduct} from './static/dummy-product';

export type CatalogSource = 'shopify' | 'static';

export type CatalogOptions = {
  storefront?: Storefront;
  useStatic?: boolean;
};

async function withCatalog<T>(
  fetchFromShopify: (storefront: Storefront) => Promise<T>,
  staticFallback: () => T | Promise<T>,
  options?: CatalogOptions,
): Promise<T> {
  if (options?.useStatic) {
    return staticFallback();
  }

  if (options?.storefront) {
    try {
      return await fetchFromShopify(options.storefront);
    } catch (error) {
      console.warn(
        '[catalog] Shopify fetch failed, falling back to static data',
        error,
      );
    }
  }

  return staticFallback();
}

/** Static catalog only — Shopify catalog is seeded via npm run seed:dummy-product */
function withStaticDummyProducts(products: Product[], options?: CatalogOptions) {
  if (options?.useStatic) return withDummyTestProduct(products);
  return products;
}

export async function listProducts(
  options?: CatalogOptions,
): Promise<Product[]> {
  const products = await withCatalog(
    ShopifyRepository.listProducts,
    () => StaticRepository.products,
    options,
  );
  return withStaticDummyProducts(products, options);
}

export async function findProductByHandle(
  handle: string,
  options?: CatalogOptions,
): Promise<Product | undefined> {
  return withCatalog(
    (storefront) => ShopifyRepository.findProductByHandle(storefront, handle),
    () => StaticRepository.getProduct(handle),
    options,
  );
}

export async function listCollections(
  options?: CatalogOptions,
): Promise<Collection[]> {
  return withCatalog(
    ShopifyRepository.listCollections,
    () => StaticRepository.collections,
    options,
  );
}

export async function findCollectionByHandle(
  handle: string,
  options?: CatalogOptions,
): Promise<Collection | undefined> {
  return withCatalog(
    (storefront) =>
      ShopifyRepository.findCollectionByHandle(storefront, handle),
    () => StaticRepository.getCollection(handle),
    options,
  );
}

export async function listProductsByCollection(
  handle: string,
  options?: CatalogOptions,
): Promise<Product[]> {
  const products = await withCatalog(
    (storefront) =>
      ShopifyRepository.listProductsByCollection(storefront, handle),
    () => StaticRepository.productsByCollection(handle),
    options,
  );
  return withStaticDummyProducts(products, options);
}

export async function listWeaveFacets(
  options?: CatalogOptions,
): Promise<string[]> {
  const items = await listProducts(options);
  return Array.from(new Set(items.map((product) => product.weave))).sort();
}

export async function listOriginFacets(
  options?: CatalogOptions,
): Promise<string[]> {
  const items = await listProducts(options);
  return Array.from(new Set(items.map((product) => product.origin))).sort();
}

export async function getCatalogSnapshot(
  options?: CatalogOptions,
): Promise<CatalogSnapshot> {
  const snapshot = await withCatalog(
    ShopifyRepository.getCatalogSnapshot,
    async () => ({
      products: StaticRepository.products,
      collections: StaticRepository.collections,
    }),
    options,
  );
  return {
    ...snapshot,
    products: withStaticDummyProducts(snapshot.products, options),
  };
}
