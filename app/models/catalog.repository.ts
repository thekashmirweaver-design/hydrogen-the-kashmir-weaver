import type {Storefront} from '@shopify/hydrogen';
import type {CatalogSnapshot, Collection, Product} from './types';
import * as ShopifyRepository from './shopify/repository';
import * as StaticRepository from './static/repository';
import {withDummyTestProduct} from './static/dummy-product';
import {PRODUCT_LIST_PAGE_SIZE} from '~/lib/catalog-constants';
import type {PaginatedProducts} from '~/lib/catalog-pagination';
import {DEFAULT_FEATURED_COLLECTION_HANDLE} from '~/lib/featured-collection';
import {loadHomepageFeatured} from '~/lib/homepage-featured';

export type CatalogSource = 'shopify' | 'static';

export type CatalogOptions = {
  storefront?: Storefront;
  useStatic?: boolean;
  sortKey?: string;
  sortReverse?: boolean;
  filters?: Record<string, unknown>[];
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
      console.warn('[catalog] Shopify fetch failed', error);
      if (options.useStatic) {
        return staticFallback();
      }
      throw error;
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

function sortStaticProducts(products: Product[], sortKey?: string, sortReverse?: boolean): Product[] {
  if (!sortKey) return products;
  const sorted = [...products];
  const dir = sortReverse ? -1 : 1;

  if (sortKey === 'PRICE') {
    sorted.sort((a, b) => (a.price.amount - b.price.amount) * dir);
  } else if (sortKey === 'CREATED_AT' || sortKey === 'CREATED') {
    sorted.sort((a, b) => (Date.parse(a.createdAt) - Date.parse(b.createdAt)) * dir);
  } else if (sortKey === 'BEST_SELLING') {
    sorted.sort((a, b) => {
      const score = (p: Product) =>
        (p.tags?.some((t) => /best-?sell/i.test(t)) ? 2 : 0) +
        (p.limited ? 1 : 0);
      return (score(b) - score(a)) * dir;
    });
  }

  return sorted;
}

function applyStaticFilters(products: Product[], options?: CatalogOptions): Product[] {
  const filters = options?.filters;
  if (!filters?.length) return products;
  return products.filter((p) => {
    for (const f of filters) {
      if ('price' in f) {
        const pr = f.price as {min?: number; max?: number};
        if (pr.min !== undefined && p.price.amount < pr.min) return false;
        if (pr.max !== undefined && p.price.amount > pr.max) return false;
      }
    }
    return true;
  });
}

function paginateStaticProducts(
  products: Product[],
  first: number,
  after: string | null | undefined,
  options?: CatalogOptions,
): PaginatedProducts {
  const filtered = applyStaticFilters(products, options);
  const sorted = sortStaticProducts(filtered, options?.sortKey, options?.sortReverse);
  const offset = after ? Number.parseInt(after, 10) : 0;
  const start = Number.isFinite(offset) ? offset : 0;
  const slice = sorted.slice(start, start + first);
  const nextOffset = start + slice.length;
  const hasNextPage = nextOffset < sorted.length;
  return {
    products: slice,
    pageInfo: {
      hasNextPage,
      endCursor: hasNextPage ? String(nextOffset) : null,
    },
  };
}

export async function listProductsPage(
  options?: CatalogOptions,
  page?: {first?: number; after?: string | null},
): Promise<PaginatedProducts> {
  const first = page?.first ?? PRODUCT_LIST_PAGE_SIZE;

  if (options?.useStatic) {
    return paginateStaticProducts(
      withStaticDummyProducts(StaticRepository.products, options),
      first,
      page?.after,
      options,
    );
  }

  if (options?.storefront) {
    try {
      if (options.filters?.length) {
        const allProducts = await listProducts(options);
        return paginateStaticProducts(allProducts, first, page?.after, options);
      }

      return await ShopifyRepository.listProductsPage(options.storefront, {
        first,
        after: page?.after,
        sortKey: options.sortKey,
        sortReverse: options.sortReverse,
      });
    } catch (error) {
      console.warn('[catalog] Shopify paginated fetch failed', error);
      if (options.useStatic) {
        return paginateStaticProducts(
          withStaticDummyProducts(StaticRepository.products, options),
          first,
          page?.after,
          options,
        );
      }
      throw error;
    }
  }

  return paginateStaticProducts(StaticRepository.products, first, page?.after, options);
}

export async function listFeaturedCollectionProducts(
  options?: CatalogOptions,
  featuredCollectionHandle: string = DEFAULT_FEATURED_COLLECTION_HANDLE,
  count?: number,
): Promise<Product[]> {
  const products = await listProductsByCollection(
    featuredCollectionHandle,
    options,
    {sortKey: 'MANUAL', sortReverse: false},
  );
  return count != null && count > 0 ? products.slice(0, count) : products;
}

export async function listFeaturedProductsPage(
  options?: CatalogOptions,
  page?: {first?: number; after?: string | null},
  filter?: {collectionHandle?: string; featuredCollectionHandle?: string},
): Promise<PaginatedProducts> {
  const first = page?.first ?? PRODUCT_LIST_PAGE_SIZE;
  const handle =
    filter?.featuredCollectionHandle ??
    (options?.storefront
      ? (await loadHomepageFeatured(options.storefront)).featuredCollectionHandle
      : DEFAULT_FEATURED_COLLECTION_HANDLE);
  let featuredProducts = await listFeaturedCollectionProducts(options, handle, 0);

  if (filter?.collectionHandle) {
    featuredProducts = featuredProducts.filter(
      (product) => product.collectionSlug === filter.collectionHandle,
    );
  }

  return paginateStaticProducts(featuredProducts, first, page?.after);
}

export async function listCollectionProductsPage(
  handle: string,
  options?: CatalogOptions,
  page?: {first?: number; after?: string | null},
): Promise<PaginatedProducts & {collection?: Collection}> {
  const first = page?.first ?? PRODUCT_LIST_PAGE_SIZE;

  if (options?.useStatic) {
    const paginated = paginateStaticProducts(
      withStaticDummyProducts(
        StaticRepository.productsByCollection(handle),
        options,
      ),
      first,
      page?.after,
      options,
    );
    return {
      ...paginated,
      collection: StaticRepository.getCollection(handle),
    };
  }

  if (options?.storefront) {
    try {
      return await ShopifyRepository.listCollectionProductsPage(
        options.storefront,
        handle,
        {first, after: page?.after, sortKey: options.sortKey, sortReverse: options.sortReverse, filters: options.filters},
      );
    } catch (error) {
      console.warn('[catalog] Shopify collection page fetch failed', error);
      throw error;
    }
  }

  const paginated = paginateStaticProducts(
    StaticRepository.productsByCollection(handle),
    first,
    page?.after,
    options,
  );
  return {
    ...paginated,
    collection: StaticRepository.getCollection(handle),
  };
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
  const collections = await withCatalog(
    ShopifyRepository.listCollections,
    () => StaticRepository.collections,
    options,
  );
  return collections.filter(
    (collection) => collection.handle !== DEFAULT_FEATURED_COLLECTION_HANDLE,
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
  sort?: {sortKey?: string; sortReverse?: boolean},
): Promise<Product[]> {
  const products = await withCatalog(
    (storefront) =>
      ShopifyRepository.listProductsByCollection(storefront, handle, sort),
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

export async function getCatalogMenuSnapshot(
  options?: CatalogOptions,
): Promise<CatalogSnapshot> {
  const snapshot = await withCatalog(
    ShopifyRepository.getCatalogMenuSnapshot,
    async () => ({
      products: StaticRepository.products.map((product) => ({
        ...product,
        images: product.images.slice(0, 1),
        variants: undefined,
        options: undefined,
        shades: undefined,
      })),
      collections: StaticRepository.collections,
    }),
    options,
  );
  return {
    ...snapshot,
    products: withStaticDummyProducts(snapshot.products, options),
  };
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
