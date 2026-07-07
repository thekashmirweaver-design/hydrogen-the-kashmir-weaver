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

const PRODUCT_PAGE_SIZE = 250;
const COLLECTION_PAGE_SIZE = 50;

type ProductQueryResult = {
  products: {edges: Array<{node: ShopifyProductNode}>};
};

type MenuProductQueryResult = {
  products: {edges: Array<{node: ShopifyMenuProductNode}>};
};

type ProductByHandleResult = {
  product: ShopifyProductNode | null;
};

type CollectionByHandleResult = {
  collection: (ShopifyCollectionNode & {
    products?: {edges: Array<{node: ShopifyProductNode}>};
  }) | null;
};

export async function listProducts(storefront: Storefront): Promise<Product[]> {
  const data = await catalogQuery<ProductQueryResult>(
    storefront,
    ALL_PRODUCTS_QUERY,
    ALL_PRODUCTS_QUERY_NO_INVENTORY,
    {first: PRODUCT_PAGE_SIZE},
  );

  return data.products.edges.map(({node}: {node: ShopifyProductNode}) =>
    mapProduct(node),
  );
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
    {handle, productFirst: PRODUCT_PAGE_SIZE},
  );

  return data.collection ? mapCollection(data.collection) : undefined;
}

export async function listProductsByCollection(
  storefront: Storefront,
  handle: string,
): Promise<Product[]> {
  const data = await catalogQuery<CollectionByHandleResult>(
    storefront,
    COLLECTION_BY_HANDLE_QUERY,
    COLLECTION_BY_HANDLE_QUERY_NO_INVENTORY,
    {handle, productFirst: PRODUCT_PAGE_SIZE},
  );

  if (!data.collection?.products) return [];

  return data.collection.products.edges.map(
    ({node}: {node: ShopifyProductNode}) => mapProduct(node),
  );
}

export async function listMenuProducts(
  storefront: Storefront,
): Promise<Product[]> {
  const data = await storefront.query<MenuProductQueryResult>(
    ALL_MENU_PRODUCTS_QUERY,
    {
      variables: {first: PRODUCT_PAGE_SIZE},
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
