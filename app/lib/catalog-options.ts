import type {Storefront} from '@shopify/hydrogen';
import type {CatalogOptions} from '~/models/catalog.repository';

type LoaderContext = {
  storefront: Storefront;
  env: Env;
};

export type JournalOptions = {
  storefront: Storefront;
  /** Demo journal posts when true (same flag as static catalog). */
  useStatic: boolean;
};

/** Storefront catalog with static fallback; set USE_STATIC_CATALOG=true to force demo data. */
export function getCatalogOptions(context: LoaderContext): CatalogOptions {
  return {
    storefront: context.storefront,
    useStatic: context.env.USE_STATIC_CATALOG === 'true',
  };
}

/** Journal from Shopify; static posts only when USE_STATIC_CATALOG=true. */
export function getJournalOptions(context: LoaderContext): JournalOptions {
  return {
    storefront: context.storefront,
    useStatic: context.env.USE_STATIC_CATALOG === 'true',
  };
}
