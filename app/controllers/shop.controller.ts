import * as CatalogRepository from '~/models/catalog.repository';
import type {CatalogOptions} from '~/models/catalog.repository';
import type {Collection, Product} from '~/models/types';
import type {PageMetadata} from '~/controllers/catalog.controller';

export type ShopPageViewModel = {
  products: Product[];
};

export async function getShopPage(
  options?: CatalogOptions,
): Promise<ShopPageViewModel> {
  return {products: await CatalogRepository.listProducts(options)};
}

export type CollectionsPageViewModel = {
  collections: Collection[];
  productCountByHandle: Record<string, number>;
};

export async function getCollectionsPage(
  options?: CatalogOptions,
): Promise<CollectionsPageViewModel> {
  const [collections, products] = await Promise.all([
    CatalogRepository.listCollections(options),
    CatalogRepository.listProducts(options),
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
  options?: CatalogOptions,
): Promise<CollectionPageViewModel | null> {
  const collection = await CatalogRepository.findCollectionByHandle(
    handle,
    options,
  );
  if (!collection) return null;

  const products = await CatalogRepository.listProductsByCollection(
    handle,
    options,
  );
  return {collection, products};
}

export async function getCollectionMetadata(
  handle: string,
  options?: CatalogOptions,
): Promise<PageMetadata> {
  const collection = await CatalogRepository.findCollectionByHandle(
    handle,
    options,
  );
  if (!collection) return {title: 'Not found — The Kashmir Weaver'};

  const title =
    collection.seo?.title ?? `${collection.name} — The Kashmir Weaver`;
  const description = collection.seo?.description ?? collection.story;

  return {title, description};
}

export async function listCollectionHandles(
  options?: CatalogOptions,
): Promise<string[]> {
  const collections = await CatalogRepository.listCollections(options);
  return collections.map((c) => c.handle);
}

export async function getSearchCatalog(options?: CatalogOptions) {
  return CatalogRepository.getCatalogSnapshot(options);
}
