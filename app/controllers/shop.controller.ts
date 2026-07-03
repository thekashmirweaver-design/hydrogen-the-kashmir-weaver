import * as CatalogRepository from '~/models/catalog.repository';
import type {Collection, Product} from '~/models/types';
import type {PageMetadata} from '~/controllers/catalog.controller';

export type ShopPageViewModel = {
  products: Product[];
};

export async function getShopPage(): Promise<ShopPageViewModel> {
  return {products: await CatalogRepository.listProducts()};
}

export type CollectionsPageViewModel = {
  collections: Collection[];
  productCountByHandle: Record<string, number>;
};

export async function getCollectionsPage(): Promise<CollectionsPageViewModel> {
  const [collections, products] = await Promise.all([
    CatalogRepository.listCollections(),
    CatalogRepository.listProducts(),
  ]);

  const productCountByHandle = Object.fromEntries(
    collections.map((c) => [
      c.handle,
      products.filter((p) => p.collectionSlug === c.handle).length,
    ]),
  );

  return {collections, productCountByHandle};
}

export type CollectionPageViewModel = {
  collection: Collection;
  products: Product[];
};

export async function getCollectionPage(
  handle: string,
): Promise<CollectionPageViewModel | null> {
  const collection = await CatalogRepository.findCollectionByHandle(handle);
  if (!collection) return null;

  const products = await CatalogRepository.listProductsByCollection(handle);
  return {collection, products};
}

export async function getCollectionMetadata(
  handle: string,
): Promise<PageMetadata> {
  const collection = await CatalogRepository.findCollectionByHandle(handle);
  if (!collection) return {title: 'Not found — The Kashmir Weaver'};

  const title =
    collection.seo?.title ?? `${collection.name} — The Kashmir Weaver`;
  const description = collection.seo?.description ?? collection.story;

  return {title, description};
}

export async function listCollectionHandles(): Promise<string[]> {
  const collections = await CatalogRepository.listCollections();
  return collections.map((c) => c.handle);
}

export async function getSearchCatalog() {
  return CatalogRepository.getCatalogSnapshot();
}
