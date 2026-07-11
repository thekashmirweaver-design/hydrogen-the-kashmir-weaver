import {absoluteUrl, resolveStoreUrl} from '~/lib/seo';
import {buildAtomXml} from '~/lib/feeds/build-atom-xml';
import {buildRssXml} from '~/lib/feeds/build-rss-xml';
import {atomResponse, rssResponse} from '~/lib/feeds/response';
import type {FeedChannel, FeedItem} from '~/lib/feeds/types';

export type FeedFormat = 'rss' | 'atom';

export function resolveFeedStoreUrl(
  envStoreUrl: string | undefined,
  request: Request,
): string {
  return resolveStoreUrl(envStoreUrl, request.url);
}

export function serveFeed(options: {
  format: FeedFormat;
  channel: FeedChannel;
  items: FeedItem[];
  status?: number;
}): Response {
  const xml =
    options.format === 'rss'
      ? buildRssXml(options.channel, options.items)
      : buildAtomXml(options.channel, options.items);
  return options.format === 'rss'
    ? rssResponse(xml, {status: options.status})
    : atomResponse(xml, {status: options.status});
}

export function siteFeedChannel(
  storeUrl: string,
  selfPath: string,
): FeedChannel {
  return {
    title: 'The Kashmir Weaver',
    link: absoluteUrl('/', storeUrl),
    description:
      'Stories, craft, and new pieces from The Kashmir Weaver — handwoven Kashmiri pashmina.',
    selfUrl: absoluteUrl(selfPath, storeUrl),
  };
}

export function journalFeedChannel(
  storeUrl: string,
  selfPath: string,
  titleSuffix?: string,
): FeedChannel {
  const suffix = titleSuffix ? ` — ${titleSuffix}` : '';
  return {
    title: `Journal${suffix} — The Kashmir Weaver`,
    link: absoluteUrl('/journal', storeUrl),
    description:
      'Stories from the valley — heritage, craft, care, and the quiet luxury of Kashmiri pashmina.',
    selfUrl: absoluteUrl(selfPath, storeUrl),
  };
}

export function productsFeedChannel(
  storeUrl: string,
  selfPath: string,
): FeedChannel {
  return {
    title: 'Products — The Kashmir Weaver',
    link: absoluteUrl('/collections/all', storeUrl),
    description:
      'New and updated handwoven Kashmiri pashmina products from The Kashmir Weaver.',
    selfUrl: absoluteUrl(selfPath, storeUrl),
  };
}
