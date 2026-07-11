import type {Storefront} from '@shopify/hydrogen';
import {blogCache} from '~/lib/storefront-cache';
import type {JournalOptions} from '~/lib/catalog-options';
import {
  ARTICLES,
  JOURNAL_CATEGORIES,
  POSTS,
  type JournalArticle,
  type JournalCategory,
  type JournalPost,
} from '~/models/static/journal';
import {
  JOURNAL_ARTICLE_QUERY,
  JOURNAL_BLOG_HANDLE,
  JOURNAL_BLOG_QUERY,
} from '~/models/shopify/journal.queries';
import {estimateReadMinutes, htmlToPlainText} from '~/lib/parse-page-content';
import type {PageMetadata} from '~/controllers/catalog.controller';
import {
  mapJournalSourceToFeedItem,
  sortFeedItemsNewestFirst,
  type FeedItem,
  type JournalFeedSource,
} from '~/lib/feeds';

export type JournalPageViewModel = {
  posts: JournalPost[];
  categories: typeof JOURNAL_CATEGORIES;
  metadata: PageMetadata;
  pageInfo: {
    currentPage: number;
    totalPages: number;
    totalPosts: number;
    perPage: number;
    hasNextPage: boolean;
    hasPreviousPage: boolean;
  };
};

export type JournalPageOptions = {
  page?: number;
  perPage?: number;
  /** Hard cap on articles fetched from Shopify (cursor loop stops early). */
  maxArticles?: number;
};

export type ArticlePageViewModel = {
  slug: string;
  article: JournalArticle;
  metadata: PageMetadata;
  datePublished?: string;
};

const VALID_CATEGORIES = new Set<string>(JOURNAL_CATEGORIES);

/** Default articles rendered per /journal page. */
const JOURNAL_PER_PAGE = 12;
/** Per-page GraphQL fetch size while cursor-looping. */
const JOURNAL_FETCH_PAGE_SIZE = 50;
/** Safety caps for the cursor loop (prevents runaway pagination). */
const JOURNAL_MAX_PAGES = 25;
const JOURNAL_MAX_ARTICLES = JOURNAL_FETCH_PAGE_SIZE * JOURNAL_MAX_PAGES;

const DEFAULT_JOURNAL_METADATA: PageMetadata = {
  title: 'Journal — The Kashmir Weaver',
  description:
    'Stories from the valley — heritage, craft, care, and the quiet luxury of Kashmiri pashmina.',
};

function mapCategory(tags: string[] | null | undefined): JournalCategory {
  const match = tags?.find((tag) => VALID_CATEGORIES.has(tag));
  return (match as JournalCategory | undefined) ?? 'Heritage';
}

function emptyJournalPage(options: JournalPageOptions = {}): JournalPageViewModel {
  const perPage = options.perPage ?? JOURNAL_PER_PAGE;
  const page = Math.max(1, options.page ?? 1);
  return {
    posts: [],
    categories: JOURNAL_CATEGORIES,
    metadata: DEFAULT_JOURNAL_METADATA,
    pageInfo: emptyPagination({page, perPage, totalPosts: 0}),
  };
}

function paginate<T>(
  items: T[],
  page: number,
  perPage: number,
): {slice: T[]; pageInfo: JournalPageViewModel['pageInfo']} {
  const safePage = Math.max(1, Math.floor(page));
  const safePerPage = Math.max(1, Math.floor(perPage));
  const totalPosts = items.length;
  const totalPages = totalPosts === 0 ? 0 : Math.ceil(totalPosts / safePerPage);
  const start = (safePage - 1) * safePerPage;
  const slice = items.slice(start, start + safePerPage);
  return {
    slice,
    pageInfo: {
      currentPage: safePage,
      totalPages,
      totalPosts,
      perPage: safePerPage,
      hasNextPage: safePage < totalPages,
      hasPreviousPage: safePage > 1,
    },
  };
}

function emptyPagination(input: {
  page: number;
  perPage: number;
  totalPosts: number;
}): JournalPageViewModel['pageInfo'] {
  const totalPages = input.totalPosts === 0 ? 0 : Math.ceil(input.totalPosts / input.perPage);
  return {
    currentPage: input.page,
    totalPages,
    totalPosts: input.totalPosts,
    perPage: input.perPage,
    hasNextPage: input.page < totalPages,
    hasPreviousPage: input.page > 1,
  };
}

function mapShopifyArticleToPost(article: {
  handle: string;
  title: string;
  excerpt?: string | null;
  contentHtml?: string | null;
  publishedAt?: string | null;
  tags?: string[] | null;
  image?:
    | {
        url?: string | null;
        altText?: string | null;
        width?: number | null;
        height?: number | null;
      }
    | null
    | undefined;
}): JournalPost {
  const bodyText = htmlToPlainText(article.contentHtml);
  return {
    slug: article.handle,
    cat: mapCategory(article.tags),
    title: article.title,
    excerpt: article.excerpt?.trim() || bodyText.slice(0, 160).trim(),
    img: article.image?.url ?? '/assets/journal-craft.jpg',
    alt: article.image?.altText ?? null,
    width: article.image?.width ?? null,
    height: article.image?.height ?? null,
    minutes: estimateReadMinutes(bodyText),
    date: article.publishedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  };
}

function mapShopifyArticleToArticle(article: {
  handle: string;
  title: string;
  contentHtml?: string | null;
  tags?: string[] | null;
  image?:
    | {
        url?: string | null;
        altText?: string | null;
        width?: number | null;
        height?: number | null;
      }
    | null
    | undefined;
}): JournalArticle {
  const bodyHtml = article.contentHtml?.trim() || undefined;
  const bodyText = htmlToPlainText(bodyHtml);
  return {
    title: article.title,
    cat: mapCategory(article.tags),
    minutes: estimateReadMinutes(bodyText),
    img: article.image?.url ?? '/assets/journal-craft.jpg',
    alt: article.image?.altText ?? null,
    width: article.image?.width ?? null,
    height: article.image?.height ?? null,
    bodyHtml,
  };
}

type ShopifyArticleNode = {
  id?: string | null;
  handle: string;
  title: string;
  excerpt?: string | null;
  contentHtml?: string | null;
  publishedAt?: string | null;
  tags?: string[] | null;
  authorV2?: {name?: string | null} | null;
  image?:
    | {
        url?: string | null;
        altText?: string | null;
        width?: number | null;
        height?: number | null;
      }
    | null;
};

type ShopifyArticlesResponse = {
  blog?: {
    seo?: ShopifyBlogSeo;
    articles?: {
      nodes?: ShopifyArticleNode[] | null;
      pageInfo?: ShopifyArticlePageInfo;
    } | null;
  } | null;
};

type ShopifyBlogSeo = {title?: string | null; description?: string | null} | null | undefined;
type ShopifyArticlePageInfo = {hasNextPage: boolean; endCursor: string | null} | null | undefined;

/**
 * Fetch every published journal article via cursor pagination, bounded by
 * `maxArticles` (defaults to JOURNAL_MAX_ARTICLES). Returns the merged list of
 * nodes plus the SEO metadata for the blog.
 */
async function fetchAllShopifyJournalNodes(
  storefront: Storefront,
  options: {maxArticles?: number} = {},
): Promise<
  | {
      nodes: ShopifyArticleNode[];
      hasMore: boolean;
      seo: ShopifyBlogSeo;
    }
  | null
> {
  const maxArticles = options.maxArticles ?? JOURNAL_MAX_ARTICLES;
  const collected: ShopifyArticleNode[] = [];
  let cursor: string | null = null;
  let hasMore = false;
  let seo: ShopifyBlogSeo;

  for (let page = 0; page < JOURNAL_MAX_PAGES; page++) {
    const remaining = Math.max(0, maxArticles - collected.length);
    if (remaining === 0) break;

    const first = Math.min(JOURNAL_FETCH_PAGE_SIZE, remaining);
    const data: ShopifyArticlesResponse = await storefront.query<ShopifyArticlesResponse>(
      JOURNAL_BLOG_QUERY,
      {
        variables: {
          blogHandle: JOURNAL_BLOG_HANDLE,
          first,
          after: cursor,
        },
        cache: blogCache(storefront),
      },
    );

    const blog: ShopifyArticlesResponse['blog'] = data.blog;
    if (!blog) {
      hasMore = false;
      break;
    }

    if (seo === undefined) seo = blog.seo;

    const nodes: ShopifyArticleNode[] = blog.articles?.nodes ?? [];
    if (nodes.length) collected.push(...nodes);

    const info: ShopifyArticlePageInfo = blog.articles?.pageInfo ?? null;
    if (info && info.hasNextPage && info.endCursor && collected.length < maxArticles) {
      cursor = info.endCursor;
      hasMore = true;
    } else {
      hasMore = false;
      break;
    }
  }

  return {nodes: collected, hasMore, seo};
}

export async function getJournalPage(
  options: JournalOptions,
  pagination: JournalPageOptions = {},
): Promise<JournalPageViewModel> {
  const perPage = pagination.perPage ?? JOURNAL_PER_PAGE;
  const page = Math.max(1, Math.floor(pagination.page ?? 1));
  const maxArticles = pagination.maxArticles ?? JOURNAL_MAX_ARTICLES;

  try {
    const result = await fetchAllShopifyJournalNodes(options.storefront, {
      maxArticles,
    });
    if (result) {
      const sorted = sortPostsByDate(result.nodes.map(mapShopifyArticleToPost));
      const {slice, pageInfo} = paginate(sorted, page, perPage);
      return {
        posts: slice,
        categories: JOURNAL_CATEGORIES,
        metadata: {
          title: result.seo?.title ?? DEFAULT_JOURNAL_METADATA.title,
          description:
            result.seo?.description ?? DEFAULT_JOURNAL_METADATA.description,
        },
        pageInfo,
      };
    }
  } catch {
    // Storefront unavailable — optional static demo when enabled.
  }

  if (!options.useStatic) return emptyJournalPage({page, perPage});

  const sorted = sortPostsByDate(POSTS);
  const {slice, pageInfo} = paginate(sorted, page, perPage);
  return {
    posts: slice,
    categories: JOURNAL_CATEGORIES,
    metadata: DEFAULT_JOURNAL_METADATA,
    pageInfo,
  };
}

/** Fetch and map every journal article (used by sitemap/llms-full). */
export async function listAllJournalPosts(
  options: JournalOptions,
  pagination: {maxArticles?: number} = {},
): Promise<JournalPost[]> {
  try {
    const result = await fetchAllShopifyJournalNodes(options.storefront, {
      maxArticles: pagination.maxArticles ?? JOURNAL_MAX_ARTICLES,
    });
    if (result) {
      return sortPostsByDate(result.nodes.map(mapShopifyArticleToPost));
    }
  } catch {
    // Storefront unavailable — optional static demo when enabled.
  }

  return options.useStatic ? sortPostsByDate(POSTS) : [];
}

function nodeToFeedSource(node: ShopifyArticleNode): JournalFeedSource {
  return {
    handle: node.handle,
    title: node.title,
    excerpt: node.excerpt,
    contentHtml: node.contentHtml,
    publishedAt: node.publishedAt,
    tags: node.tags,
    author: node.authorV2?.name,
    category: mapCategory(node.tags),
    image: node.image,
  };
}

function staticPostsToFeedSources(): JournalFeedSource[] {
  return POSTS.map((post) => {
    const article = ARTICLES[post.slug];
    const bodyHtml =
      article?.bodyHtml ||
      article?.body?.map((p) => `<p>${p}</p>`).join('') ||
      undefined;
    return {
      handle: post.slug,
      title: post.title,
      excerpt: post.excerpt,
      contentHtml: bodyHtml,
      publishedAt: `${post.date}T00:00:00.000Z`,
      tags: [post.cat],
      author: 'The Kashmir Weaver',
      category: post.cat,
      image: {url: post.img, altText: post.alt},
    };
  });
}

/**
 * Full journal items for RSS/Atom syndication (includes HTML body + author).
 */
export async function listAllJournalFeedItems(
  options: JournalOptions,
  storeUrl: string,
  pagination: {maxArticles?: number} = {},
): Promise<FeedItem[]> {
  try {
    const result = await fetchAllShopifyJournalNodes(options.storefront, {
      maxArticles: pagination.maxArticles ?? JOURNAL_MAX_ARTICLES,
    });
    if (result) {
      return sortFeedItemsNewestFirst(
        result.nodes.map((node) =>
          mapJournalSourceToFeedItem(nodeToFeedSource(node), storeUrl),
        ),
      );
    }
  } catch {
    // Storefront unavailable — optional static demo when enabled.
  }

  if (!options.useStatic) return [];

  return sortFeedItemsNewestFirst(
    staticPostsToFeedSources().map((source) =>
      mapJournalSourceToFeedItem(source, storeUrl),
    ),
  );
}

function sortPostsByDate(posts: JournalPost[]): JournalPost[] {
  return [...posts].sort((a, b) => b.date.localeCompare(a.date));
}

export async function getArticlePage(
  slug: string,
  options: JournalOptions,
): Promise<ArticlePageViewModel | null> {
  try {
    const data = await options.storefront.query<{
      blog?: {
        articleByHandle?: {
          handle: string;
          title: string;
          contentHtml?: string | null;
          publishedAt?: string | null;
          tags?: string[] | null;
          image?:
            | {
                url?: string | null;
                altText?: string | null;
                width?: number | null;
                height?: number | null;
              }
            | null;
          seo?: {title?: string | null; description?: string | null} | null;
        } | null;
      } | null;
    }>(JOURNAL_ARTICLE_QUERY, {
      variables: {
        blogHandle: JOURNAL_BLOG_HANDLE,
        articleHandle: slug,
      },
      cache: blogCache(options.storefront),
    });

    const article = data.blog?.articleByHandle;
    if (article) {
      const mapped = mapShopifyArticleToArticle(article);
      return {
        slug,
        article: mapped,
        datePublished: article.publishedAt?.slice(0, 10),
        metadata: {
          title:
            article.seo?.title ??
            `${article.title} — Journal — The Kashmir Weaver`,
          description:
            article.seo?.description ??
            (htmlToPlainText(article.contentHtml).slice(0, 160) ||
              article.title),
        },
      };
    }
  } catch {
    // Storefront unavailable — optional static demo when enabled.
  }

  if (!options.useStatic) return null;

  const article = ARTICLES[slug];
  if (!article) return null;

  const post = POSTS.find((entry) => entry.slug === slug);

  return {
    slug,
    article,
    datePublished: post?.date,
    metadata: {
      title: `${article.title} — Journal — The Kashmir Weaver`,
      description: article.body?.[0] ?? article.title,
    },
  };
}

export async function listArticleSlugs(
  options: JournalOptions,
): Promise<string[]> {
  try {
    const result = await fetchAllShopifyJournalNodes(options.storefront);
    if (result) {
      return result.nodes.map((node) => node.handle);
    }
  } catch {
    // Storefront unavailable — optional static demo when enabled.
  }

  return options.useStatic ? Object.keys(ARTICLES) : [];
}
