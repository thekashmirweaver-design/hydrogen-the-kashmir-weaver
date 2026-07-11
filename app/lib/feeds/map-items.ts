import {absoluteUrl} from '~/lib/seo';
import {feedDateSortKey} from '~/lib/feeds/dates';
import {slugEquals} from '~/lib/feeds/slugs';
import type {FeedItem} from '~/lib/feeds/types';
import type {Product, Collection} from '~/models/types';
import {htmlToPlainText} from '~/lib/parse-page-content';

const DEFAULT_AUTHOR = 'The Kashmir Weaver';

export type JournalFeedSource = {
  handle: string;
  title: string;
  excerpt?: string | null;
  contentHtml?: string | null;
  publishedAt?: string | null;
  tags?: string[] | null;
  author?: string | null;
  category?: string | null;
  image?:
    | {
        url?: string | null;
        altText?: string | null;
      }
    | null
    | undefined;
};

function absoluteImage(src: string, storeUrl: string): string {
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return absoluteUrl(src.startsWith('/') ? src : `/${src}`, storeUrl);
}

export function mapJournalSourceToFeedItem(
  article: JournalFeedSource,
  storeUrl: string,
): FeedItem {
  const link = absoluteUrl(`/journal/${article.handle}`, storeUrl);
  const bodyText = htmlToPlainText(article.contentHtml);
  const summary =
    article.excerpt?.trim() || bodyText.slice(0, 160).trim() || article.title;
  const categories = Array.from(
    new Set(
      [
        ...(article.category ? [article.category] : []),
        ...(article.tags ?? []),
      ].filter(Boolean),
    ),
  );
  const imageUrl = article.image?.url
    ? absoluteImage(article.image.url, storeUrl)
    : undefined;

  return {
    title: article.title,
    link,
    id: link,
    summary,
    contentHtml: article.contentHtml?.trim() || undefined,
    publishedAt:
      article.publishedAt ||
      `${new Date().toISOString().slice(0, 10)}T00:00:00.000Z`,
    author: article.author?.trim() || DEFAULT_AUTHOR,
    categories,
    image: imageUrl
      ? {url: imageUrl, title: article.image?.altText ?? article.title}
      : undefined,
  };
}

export function sortFeedItemsNewestFirst(items: FeedItem[]): FeedItem[] {
  return [...items].sort((a, b) =>
    feedDateSortKey(b.publishedAt).localeCompare(feedDateSortKey(a.publishedAt)),
  );
}

export function filterJournalFeedByCategory(
  items: FeedItem[],
  category: string,
): FeedItem[] {
  return items.filter((item) =>
    item.categories.some((cat) => slugEquals(cat, category)),
  );
}

export function filterJournalFeedByTag(
  items: FeedItem[],
  tag: string,
): FeedItem[] {
  return items.filter((item) =>
    item.categories.some((cat) => slugEquals(cat, tag)),
  );
}

export function filterJournalFeedByAuthor(
  items: FeedItem[],
  authorSlug: string,
): FeedItem[] {
  return items.filter((item) => slugEquals(item.author, authorSlug));
}

export function mapProductToFeedItem(
  product: Product,
  storeUrl: string,
): FeedItem {
  const link = absoluteUrl(`/products/${product.handle}`, storeUrl);
  const summary =
    product.shortDescription?.trim() ||
    htmlToPlainText(product.description).slice(0, 160).trim() ||
    product.name;
  const categories = Array.from(
    new Set(
      [
        ...(product.productType ? [product.productType] : []),
        ...(product.tags ?? []),
        ...(product.collectionName ? [product.collectionName] : []),
      ].filter(Boolean),
    ),
  );
  const imageSrc = product.images[0]?.src;
  const imageUrl = imageSrc ? absoluteImage(imageSrc, storeUrl) : undefined;

  return {
    title: product.name,
    link,
    id: link,
    summary,
    contentHtml: product.description?.trim() || undefined,
    publishedAt: product.publishedAt || product.createdAt,
    author: product.vendor?.trim() || DEFAULT_AUTHOR,
    categories,
    image: imageUrl
      ? {url: imageUrl, title: product.images[0]?.alt || product.name}
      : undefined,
  };
}

export function mapProductsToFeedItems(
  products: Product[],
  storeUrl: string,
): FeedItem[] {
  return sortFeedItemsNewestFirst(
    products.map((product) => mapProductToFeedItem(product, storeUrl)),
  );
}

export function collectionChannelMeta(
  collection: Collection,
  storeUrl: string,
): {title: string; link: string; description: string} {
  return {
    title: `${collection.name} — The Kashmir Weaver`,
    link: absoluteUrl(`/collections/${collection.handle}`, storeUrl),
    description:
      collection.tagline?.trim() ||
      collection.story?.trim() ||
      `Products in the ${collection.name} collection.`,
  };
}
