import type {Route} from './+types/collections.$handle[.rss]';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadSharedCatalog} from '~/lib/shared-catalog';
import {
  collectionChannelMeta,
  mapProductsToFeedItems,
  resolveFeedStoreUrl,
  serveFeed,
} from '~/lib/feeds';

export async function loader({request, context, params}: Route.LoaderArgs) {
  const handle = params.handle ?? '';
  const storeUrl = resolveFeedStoreUrl(context.env.PUBLIC_STORE_URL, request);
  const catalog = await loadSharedCatalog(request, getCatalogOptions(context));
  const collection = catalog.collections.find((c) => c.handle === handle);

  if (!collection) {
    return new Response('Collection not found', {status: 404});
  }

  const products = catalog.products.filter(
    (product) =>
      product.collectionSlug === handle ||
      product.allCollections?.some((ref) => ref.handle === handle),
  );

  const meta = collectionChannelMeta(collection, storeUrl);

  return serveFeed({
    format: 'rss',
    channel: {
      title: meta.title,
      link: meta.link,
      description: meta.description,
      selfUrl: `${storeUrl}/collections/${encodeURIComponent(handle)}.rss`,
    },
    items: mapProductsToFeedItems(products, storeUrl),
  });
}
