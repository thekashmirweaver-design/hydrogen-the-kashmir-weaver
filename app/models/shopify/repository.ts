import type {Storefront} from '@shopify/hydrogen';
import type {CatalogSnapshot, Collection, Product} from '../types';
import {
  mapCollection,
  mapMenuItems,
  mapMenuProduct,
  mapProduct,
  mapShopSettings,
  type ShopifyCollectionNode,
  type ShopifyMenuProductNode,
  type ShopifyProductNode,
} from './mappers';
import {collectionCache, productCache} from '~/lib/storefront-cache';
import {
  PRODUCT_FETCH_BATCH_SIZE,
  PRODUCT_LIST_PAGE_SIZE,
} from '~/lib/catalog-constants';
import type {CatalogPageInfo, PaginatedProducts} from '~/lib/catalog-pagination';
import {catalogQuery} from './catalog-query';
import {
  ALL_COLLECTIONS_QUERY,
  ALL_MENU_PRODUCTS_QUERY,
  ALL_PRODUCTS_QUERY,
  ALL_PRODUCTS_QUERY_NO_INVENTORY,
  COLLECTION_BY_HANDLE_QUERY,
  COLLECTION_BY_HANDLE_QUERY_NO_INVENTORY,
  FOOTER_MENU_HANDLE,
  HEADER_MENU_HANDLE,
  PRODUCT_BY_HANDLE_QUERY,
  PRODUCT_BY_HANDLE_QUERY_NO_INVENTORY,
  SHOP_CATALOG_QUERY,
} from './queries';

const COLLECTION_PAGE_SIZE = 50;

type ProductQueryResult = {
  products: {
    edges: Array<{node: ShopifyProductNode}>;
    pageInfo: CatalogPageInfo;
  };
};

type MenuProductQueryResult = {
  products: {edges: Array<{node: ShopifyMenuProductNode}>};
};

type ProductByHandleResult = {
  product: ShopifyProductNode | null;
};

type CollectionByHandleResult = {
  collection: (ShopifyCollectionNode & {
    products?: {
      edges: Array<{node: ShopifyProductNode}>;
      pageInfo: CatalogPageInfo;
    };
  }) | null;
};

function mapPageInfo(pageInfo?: CatalogPageInfo | null): CatalogPageInfo {
  return {
    hasNextPage: pageInfo?.hasNextPage ?? false,
    endCursor: pageInfo?.endCursor ?? null,
  };
}

export async function listProductsPage(
  storefront: Storefront,
  options: {first?: number; after?: string | null; sortKey?: string; sortReverse?: boolean} = {},
): Promise<PaginatedProducts> {
  const first = options.first ?? PRODUCT_LIST_PAGE_SIZE;
  const data = await catalogQuery<ProductQueryResult>(
    storefront,
    ALL_PRODUCTS_QUERY,
    ALL_PRODUCTS_QUERY_NO_INVENTORY,
    {
      first,
      after: options.after ?? null,
      sortKey: options.sortKey ?? 'CREATED_AT',
      reverse: options.sortReverse ?? true,
    },
  );

  if (!data?.products?.edges) {
    throw new Error('[catalog] Storefront products query returned no products');
  }

  return {
    products: data.products.edges.map(({node}) => mapProduct(node)),
    pageInfo: mapPageInfo(data.products.pageInfo),
  };
}

export async function listProducts(storefront: Storefront): Promise<Product[]> {
  const products: Product[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await listProductsPage(storefront, {
      first: PRODUCT_FETCH_BATCH_SIZE,
      after,
    });
    products.push(...page.products);
    hasNextPage = page.pageInfo.hasNextPage;
    after = page.pageInfo.endCursor;
  }

  return products;
}

export async function findProductByHandle(
  storefront: Storefront,
  handle: string,
): Promise<Product | undefined> {
  const data = await catalogQuery<ProductByHandleResult>(
    storefront,
    PRODUCT_BY_HANDLE_QUERY,
    PRODUCT_BY_HANDLE_QUERY_NO_INVENTORY,
    {handle},
  );

  return data.product ? mapProduct(data.product) : undefined;
}

export async function listCollections(
  storefront: Storefront,
): Promise<Collection[]> {
  const data = await storefront.query(ALL_COLLECTIONS_QUERY, {
    variables: {first: COLLECTION_PAGE_SIZE},
    cache: collectionCache(storefront),
  });

  return data.collections.edges.map(({node}: {node: ShopifyCollectionNode}) =>
    mapCollection(node),
  );
}

export async function findCollectionByHandle(
  storefront: Storefront,
  handle: string,
): Promise<Collection | undefined> {
  const data = await catalogQuery<CollectionByHandleResult>(
    storefront,
    COLLECTION_BY_HANDLE_QUERY,
    COLLECTION_BY_HANDLE_QUERY_NO_INVENTORY,
    {handle, productFirst: 1, productAfter: null},
  );

  return data.collection ? mapCollection(data.collection) : undefined;
}

export async function listCollectionProductsPage(
  storefront: Storefront,
  handle: string,
  options: {first?: number; after?: string | null; sortKey?: string; sortReverse?: boolean; filters?: Record<string, unknown>[]} = {},
): Promise<PaginatedProducts & {collection?: Collection}> {
  const first = options.first ?? PRODUCT_LIST_PAGE_SIZE;
  const data = await catalogQuery<CollectionByHandleResult>(
    storefront,
    COLLECTION_BY_HANDLE_QUERY,
    COLLECTION_BY_HANDLE_QUERY_NO_INVENTORY,
    {
      handle,
      productFirst: first,
      productAfter: options.after ?? null,
      productSortKey: options.sortKey ?? 'CREATED',
      productReverse: options.sortReverse ?? true,
      productFilters: options.filters?.length ? options.filters : undefined,
    },
  );

  if (!data.collection?.products) {
    return {
      products: [],
      pageInfo: {hasNextPage: false, endCursor: null},
      collection: data.collection
        ? mapCollection(data.collection)
        : undefined,
    };
  }

  return {
    collection: mapCollection(data.collection),
    products: data.collection.products.edges.map(({node}) => mapProduct(node)),
    pageInfo: mapPageInfo(data.collection.products.pageInfo),
  };
}

export async function listProductsByCollection(
  storefront: Storefront,
  handle: string,
  options?: {sortKey?: string; sortReverse?: boolean},
): Promise<Product[]> {
  const products: Product[] = [];
  let after: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const page = await listCollectionProductsPage(storefront, handle, {
      first: PRODUCT_FETCH_BATCH_SIZE,
      after,
      sortKey: options?.sortKey ?? 'MANUAL',
      sortReverse: options?.sortReverse ?? false,
    });
    products.push(...page.products);
    hasNextPage = page.pageInfo.hasNextPage;
    after = page.pageInfo.endCursor;
  }

  return products;
}

export async function listMenuProducts(
  storefront: Storefront,
): Promise<Product[]> {
  const data = await storefront.query<MenuProductQueryResult>(
    ALL_MENU_PRODUCTS_QUERY,
    {
      variables: {first: PRODUCT_FETCH_BATCH_SIZE},
      cache: productCache(storefront),
    },
  );

  return data.products.edges.map(({node}: {node: ShopifyMenuProductNode}) =>
    mapMenuProduct(node),
  );
}

export async function getCatalogMenuSnapshot(
  storefront: Storefront,
): Promise<CatalogSnapshot> {
  const [products, collections] = await Promise.all([
    listMenuProducts(storefront),
    listCollections(storefront),
  ]);

  return {products, collections};
}

export async function getCatalogSnapshot(
  storefront: Storefront,
): Promise<CatalogSnapshot> {
  const [products, collections] = await Promise.all([
    listProducts(storefront),
    listCollections(storefront),
  ]);

  return {products, collections};
}

export async function getShopCatalog(storefront: Storefront) {
  const data = await storefront.query(SHOP_CATALOG_QUERY, {
    variables: {
      headerMenuHandle: HEADER_MENU_HANDLE,
      footerMenuHandle: FOOTER_MENU_HANDLE,
    },
  });

  return {
    shop: mapShopSettings(data.shop),
    headerMenu: data.headerMenu
      ? mapMenuItems(data.headerMenu.items)
      : [],
    footerMenu: data.footerMenu
      ? mapMenuItems(data.footerMenu.items)
      : [],
  };
}
