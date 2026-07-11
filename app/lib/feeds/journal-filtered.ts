import type {Storefront} from '@shopify/hydrogen';
import {getJournalOptions} from '~/lib/catalog-options';
import {listAllJournalFeedItems} from '~/controllers';
import {
  filterJournalFeedByAuthor,
  filterJournalFeedByCategory,
  filterJournalFeedByTag,
  journalFeedChannel,
  resolveFeedStoreUrl,
  serveFeed,
  type FeedFormat,
} from '~/lib/feeds';

type FilterKind = 'category' | 'tag' | 'author';

type FeedLoaderContext = {
  storefront: Storefront;
  env: Env;
};

export async function serveFilteredJournalFeed(options: {
  request: Request;
  context: FeedLoaderContext;
  format: FeedFormat;
  kind: FilterKind;
  param: string;
  selfPath: string;
}): Promise<Response> {
  const storeUrl = resolveFeedStoreUrl(
    options.context.env.PUBLIC_STORE_URL,
    options.request,
  );
  const all = await listAllJournalFeedItems(
    getJournalOptions(options.context),
    storeUrl,
  );

  const items =
    options.kind === 'category'
      ? filterJournalFeedByCategory(all, options.param)
      : options.kind === 'tag'
        ? filterJournalFeedByTag(all, options.param)
        : filterJournalFeedByAuthor(all, options.param);

  const label =
    options.kind === 'category'
      ? `Category: ${options.param}`
      : options.kind === 'tag'
        ? `Tag: ${options.param}`
        : `Author: ${options.param}`;

  return serveFeed({
    format: options.format,
    channel: journalFeedChannel(storeUrl, options.selfPath, label),
    items,
  });
}
