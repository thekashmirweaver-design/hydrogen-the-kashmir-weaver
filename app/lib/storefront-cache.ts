import type {Storefront} from '@shopify/hydrogen';

const PROD_CONTENT_TTL = {
  maxAge: 60 * 3,
  staleWhileRevalidate: 60,
} as const;

function contentCache(storefront: Storefront) {
  if (import.meta.env.DEV) {
    return storefront.CacheNone();
  }
  return storefront.CacheCustom(PROD_CONTENT_TTL);
}

export function productCache(storefront: Storefront) {
  return contentCache(storefront);
}

export function collectionCache(storefront: Storefront) {
  return contentCache(storefront);
}

export function blogCache(storefront: Storefront) {
  return contentCache(storefront);
}
