import type {Route} from './+types/journal[.rss]';
import {getJournalOptions} from '~/lib/catalog-options';
import {listAllJournalFeedItems} from '~/controllers';
import {
  journalFeedChannel,
  resolveFeedStoreUrl,
  serveFeed,
} from '~/lib/feeds';

export async function loader({request, context}: Route.LoaderArgs) {
  const storeUrl = resolveFeedStoreUrl(context.env.PUBLIC_STORE_URL, request);
  const items = await listAllJournalFeedItems(
    getJournalOptions(context),
    storeUrl,
  );

  return serveFeed({
    format: 'rss',
    channel: journalFeedChannel(storeUrl, '/journal.rss'),
    items,
  });
}
