import type {Storefront} from '@shopify/hydrogen';
import type {CatalogOptions} from '~/models/catalog.repository';

type LoaderContext = {
  storefront: Storefront;
  env: Env;
};

/** Storefront catalog with static fallback; set USE_STATIC_CATALOG=true to force demo data. */
export function getCatalogOptions(context: LoaderContext): CatalogOptions {
  return {
    storefront: context.storefront,
    useStatic: context.env.USE_STATIC_CATALOG === 'true',
  };
}
