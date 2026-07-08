import type {Storefront} from '@shopify/hydrogen';
import type {Collection} from '~/models/types';
import {DEFAULT_FEATURED_COLLECTION_HANDLE} from '~/lib/featured-collection';

export type HomepageFeatured = {
  /** Manual-sort collection handle for Featured Pieces (drag order in Admin). */
  featuredCollectionHandle: string;
  collectionHandles: string[];
  heroImageUrl?: string;
  heroAlt?: string;
  /** Max products in the homepage Featured Pieces carousel. */
  featuredCount: number;
  bestSellingCount: number;
  newestCount: number;
  /** Max collections in the homepage Signature Collections section (order from collectionHandles). */
  collectionCount?: number;
  /** Product tiles shown under each homepage collection. */
  collectionPreviewCount: number;
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

/** Metafields may store absolute Oxygen/production URLs; serve /public assets locally. */
function localizePublicAssetUrl(url: string | undefined): string | undefined {
  if (!url?.trim()) return url;
  if (url.startsWith('/assets/')) return url;
  try {
    const {pathname} = new URL(url);
    if (pathname.startsWith('/assets/')) return pathname;
  } catch {
    // Not a URL — return as-is.
  }
  return url;
}

export async function loadHomepageFeatured(
  storefront: Storefront,
): Promise<HomepageFeatured> {
  try {
    const data = await storefront.query<HomepageFeaturedQueryResult>(
      HOMEPAGE_FEATURED_QUERY,
      {cache: storefront.CacheLong()},
    );
    const parsed = parseJsonField<{
      featuredCollectionHandle?: string;
      collectionHandles?: string[];
      heroImageUrl?: string;
      heroAlt?: string;
      bestSellingCount?: number;
      newestCount?: number;
      featuredCount?: number;
      collectionCount?: number;
      collectionPreviewCount?: number;
    }>(data.shop?.homepageFeatured?.value ?? undefined);

    return {
      featuredCollectionHandle:
        parsed?.featuredCollectionHandle ?? DEFAULT_FEATURED_COLLECTION_HANDLE,
      collectionHandles: parsed?.collectionHandles?.filter(Boolean) ?? [],
      heroImageUrl: localizePublicAssetUrl(parsed?.heroImageUrl),
      heroAlt: parsed?.heroAlt,
      bestSellingCount: parsed?.bestSellingCount ?? 8,
      newestCount: parsed?.newestCount ?? 8,
      featuredCount: parsed?.featuredCount ?? 8,
      collectionCount: parsed?.collectionCount,
      collectionPreviewCount: parsed?.collectionPreviewCount ?? 3,
    };
  } catch {
    return {
      featuredCollectionHandle: DEFAULT_FEATURED_COLLECTION_HANDLE,
      collectionHandles: [],
      bestSellingCount: 8,
      newestCount: 8,
      featuredCount: 8,
      collectionPreviewCount: 3,
    };
  }
}

export function pickCollectionsByHandles(
  collections: Collection[],
  handles: string[],
  options?: {limit?: number},
): Collection[] {
  const picked = handles.length
    ? handles
        .map((handle) => collections.find((c) => c.handle === handle))
        .filter((c): c is Collection => c != null)
    : [];

  const result = picked.length ? picked : [...collections];
  const limit = options?.limit;

  if (limit != null && limit > 0) {
    return result.slice(0, limit);
  }

  return result;
}
