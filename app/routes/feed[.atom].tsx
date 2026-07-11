import type {Route} from './+types/feed[.atom]';
import {getJournalOptions} from '~/lib/catalog-options';
import {listAllJournalFeedItems} from '~/controllers';
import {
  resolveFeedStoreUrl,
  serveFeed,
  siteFeedChannel,
} from '~/lib/feeds';

export async function loader({request, context}: Route.LoaderArgs) {
  const storeUrl = resolveFeedStoreUrl(context.env.PUBLIC_STORE_URL, request);
  const items = await listAllJournalFeedItems(
    getJournalOptions(context),
    storeUrl,
  );

  return serveFeed({
    format: 'atom',
    channel: siteFeedChannel(storeUrl, '/feed.atom'),
    items,
  });
}
