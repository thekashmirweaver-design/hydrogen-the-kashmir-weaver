import type {Storefront} from '@shopify/hydrogen';
import type {Collection, Product} from '~/models/types';

export type HomepageFeatured = {
  productHandles: string[];
  collectionHandles: string[];
};

const HOMEPAGE_FEATURED_QUERY = `#graphql
  query HomepageFeatured($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    shop {
      homepageFeatured: metafield(namespace: "custom", key: "homepage_featured") {
        value
      }
    }
  }
` as const;

type HomepageFeaturedQueryResult = {
  shop?: {
    homepageFeatured?: {value?: string | null} | null;
  } | null;
};

function parseJsonField<T>(value: string | null | undefined): T | null {
  if (!value?.trim()) return null;
  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

export async function loadHomepageFeatured(
  storefront: Storefront,
): Promise<HomepageFeatured> {
  try {
    const data = await storefront.query<HomepageFeaturedQueryResult>(
      HOMEPAGE_FEATURED_QUERY,
    );
    const parsed = parseJsonField<{
      productHandles?: string[];
      collectionHandles?: string[];
    }>(data.shop?.homepageFeatured?.value ?? undefined);

    return {
      productHandles: parsed?.productHandles?.filter(Boolean) ?? [],
      collectionHandles: parsed?.collectionHandles?.filter(Boolean) ?? [],
    };
  } catch {
    return {productHandles: [], collectionHandles: []};
  }
}

export function pickProductsByHandles(
  products: Product[],
  handles: string[],
  fallbackCount = 8,
): Product[] {
  if (!handles.length) return products.slice(0, fallbackCount);
  return handles
    .map((handle) => products.find((p) => p.handle === handle))
    .filter((p): p is Product => p != null);
}

export function pickCollectionsByHandles(
  collections: Collection[],
  handles: string[],
): Collection[] {
  if (!handles.length) return collections;
  const picked = handles
    .map((handle) => collections.find((c) => c.handle === handle))
    .filter((c): c is Collection => c != null);
  return picked.length ? picked : collections;
}
