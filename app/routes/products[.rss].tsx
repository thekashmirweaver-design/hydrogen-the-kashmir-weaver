import type {Route} from './+types/products[.rss]';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadSharedCatalog} from '~/lib/shared-catalog';
import {
  mapProductsToFeedItems,
  productsFeedChannel,
  resolveFeedStoreUrl,
  serveFeed,
} from '~/lib/feeds';

export async function loader({request, context}: Route.LoaderArgs) {
  const storeUrl = resolveFeedStoreUrl(context.env.PUBLIC_STORE_URL, request);
  const catalog = await loadSharedCatalog(request, getCatalogOptions(context));
  const items = mapProductsToFeedItems(catalog.products, storeUrl);

  return serveFeed({
    format: 'rss',
    channel: productsFeedChannel(storeUrl, '/products.rss'),
    items,
  });
}
