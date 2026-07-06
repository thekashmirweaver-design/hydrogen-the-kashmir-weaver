import type {Storefront} from '@shopify/hydrogen';
import type {Collection, Product} from '~/models/types';

export type HomepageFeatured = {
  productHandles: string[];
  collectionHandles: string[];
  heroImageUrl?: string;
  heroAlt?: string;
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
      productHandles?: string[];
      collectionHandles?: string[];
      heroImageUrl?: string;
      heroAlt?: string;
    }>(data.shop?.homepageFeatured?.value ?? undefined);

    return {
      productHandles: parsed?.productHandles?.filter(Boolean) ?? [],
      collectionHandles: parsed?.collectionHandles?.filter(Boolean) ?? [],
      heroImageUrl: localizePublicAssetUrl(parsed?.heroImageUrl),
      heroAlt: parsed?.heroAlt,
    };
  } catch {
    return {
      productHandles: [],
      collectionHandles: [],
    };
  }
}

/**
 * Curated handles (from the shop's `homepage_featured` metafield) come first,
 * in the order listed. Any product with its own `custom.featured` metafield
 * set to true is appended after, so merchants can flag a product as featured
 * directly on the product without editing the shop-level JSON. Falls back to
 * the first N catalog products only when neither source yields anything.
 */
export function pickProductsByHandles(
  products: Product[],
  handles: string[],
  fallbackCount = 8,
): Product[] {
  const curated = handles
    .map((handle) => products.find((p) => p.handle === handle))
    .filter((p): p is Product => p != null);

  const curatedHandles = new Set(curated.map((p) => p.handle));
  const flagged = products.filter(
    (p) => p.featured && !curatedHandles.has(p.handle),
  );

  const combined = [...curated, ...flagged];
  return combined.length ? combined : products.slice(0, fallbackCount);
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
