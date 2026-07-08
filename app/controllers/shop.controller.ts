import * as CatalogRepository from '~/models/catalog.repository';
import type {CatalogOptions} from '~/models/catalog.repository';
import type {CatalogSnapshot, Collection, Product} from '~/models/types';
import type {PageMetadata} from '~/controllers/catalog.controller';
import type {CatalogPageInfo} from '~/lib/catalog-pagination';
import {resolveCatalogSnapshot} from '~/lib/shared-catalog';

export type ShopPageViewModel = {
  products: Product[];
  pageInfo: CatalogPageInfo;
};

export async function getShopPage(
  options?: CatalogOptions,
): Promise<ShopPageViewModel> {
  return CatalogRepository.listProductsPage(options);
}

export type CollectionsPageViewModel = {
  collections: Collection[];
  productCountByHandle: Record<string, number>;
  previewProductsByHandle: Record<string, Product[]>;
  totalProductCount: number;
  featuredProducts: Product[];
};

export function buildCollectionsPageViewModel(
  catalog: CatalogSnapshot,
): CollectionsPageViewModel {
  const {collections, products} = catalog;

  const productCountByHandle = Object.fromEntries(
    collections.map((c) => [
      c.handle,
      products.filter((p) => p.collectionSlug === c.handle).length,
    ]),
  );

  const previewProductsByHandle = Object.fromEntries(
    collections.map((c) => [
      c.handle,
      products.filter((p) => p.collectionSlug === c.handle).slice(0, 3),
    ]),
  );

  return {
    collections,
    productCountByHandle,
    previewProductsByHandle,
    totalProductCount: products.length,
    featuredProducts: products.slice(0, 6),
  };
}

export async function getCollectionsPage(
  options?: CatalogOptions,
  catalog?: CatalogSnapshot,
): Promise<CollectionsPageViewModel> {
  const snapshot = await resolveCatalogSnapshot(options, catalog);
  return buildCollectionsPageViewModel(snapshot);
}

export type CollectionPageViewModel = {
  collection: Collection;
  products: Product[];
  pageInfo: CatalogPageInfo;
  metadata: PageMetadata;
  collectionLd: Record<string, unknown>;
  breadcrumbLd: Record<string, unknown>;
  itemListLd: Record<string, unknown>;
};

function collectionMetadata(collection: Collection): PageMetadata {
  return {
    title: collection.seo?.title ?? `${collection.name} — The Kashmir Weaver`,
    description:
      collection.seo?.description ??
      collection.tagline ??
      collection.story,
  };
}

export async function getCollectionPage(
  handle: string,
  options?: CatalogOptions,
  catalog?: CatalogSnapshot,
): Promise<CollectionPageViewModel | null> {
  const snapshot = await resolveCatalogSnapshot(options, catalog);
  const collectionFromSnapshot = snapshot.collections.find(
    (item) => item.handle === handle,
  );

  const paginated = await CatalogRepository.listCollectionProductsPage(
    handle,
    options,
  );

  const collection =
    paginated.collection ??
    collectionFromSnapshot ??
    (await CatalogRepository.findCollectionByHandle(handle, options));
  if (!collection) return null;

  const products = paginated.products;
  const pageInfo = paginated.pageInfo;

  const metadata = collectionMetadata(collection);
  const url = `/collections/${handle}`;
  const description = metadata.description ?? collection.story;

  return {
    collection,
    products,
    pageInfo,
    metadata,
    collectionLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: collection.name,
      description,
      image: {
        '@type': 'ImageObject',
        url: collection.hero.src,
        caption: collection.hero.alt,
      },
      url,
    },
    breadcrumbLd: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {'@type': 'ListItem', position: 1, name: 'Home', item: '/'},
        {
          '@type': 'ListItem',
          position: 2,
          name: 'Collections',
          item: '/collections',
        },
        {
          '@type': 'ListItem',
          position: 3,
          name: collection.name,
          item: url,
        },
      ],
    },
    itemListLd: {
      '@context': 'https://schema.org',
      '@type': 'ItemList',
      name: collection.name,
      url,
      itemListElement: products.slice(0, 12).map((product, index) => ({
        '@type': 'ListItem',
        position: index + 1,
        name: product.name,
        url: `/products/${product.handle}`,
      })),
    },
  };
}

/** @deprecated Use getCollectionPage — avoids a duplicate Storefront fetch. */
export async function getCollectionMetadata(
  handle: string,
  options?: CatalogOptions,
): Promise<PageMetadata> {
  const collection = await CatalogRepository.findCollectionByHandle(
    handle,
    options,
  );
  if (!collection) return {title: 'Not found — The Kashmir Weaver'};
  return collectionMetadata(collection);
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
