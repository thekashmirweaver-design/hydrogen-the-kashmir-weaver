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

export type JournalPageViewModel = {
  posts: JournalPost[];
  categories: typeof JOURNAL_CATEGORIES;
  metadata: PageMetadata;
};

export type ArticlePageViewModel = {
  slug: string;
  article: JournalArticle;
  metadata: PageMetadata;
  datePublished?: string;
};

const VALID_CATEGORIES = new Set<string>(JOURNAL_CATEGORIES);

const DEFAULT_JOURNAL_METADATA: PageMetadata = {
  title: 'Journal — The Kashmir Weaver',
  description:
    'Stories from the valley — heritage, craft, care, and the quiet luxury of Kashmiri pashmina.',
};

function mapCategory(tags: string[] | null | undefined): JournalCategory {
  const match = tags?.find((tag) => VALID_CATEGORIES.has(tag));
  return (match as JournalCategory | undefined) ?? 'Heritage';
}

function emptyJournalPage(): JournalPageViewModel {
  return {
    posts: [],
    categories: JOURNAL_CATEGORIES,
    metadata: DEFAULT_JOURNAL_METADATA,
  };
}

function staticJournalPage(): JournalPageViewModel {
  return {
    posts: POSTS,
    categories: JOURNAL_CATEGORIES,
    metadata: DEFAULT_JOURNAL_METADATA,
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

async function fetchShopifyJournalPosts(
  storefront: Storefront,
): Promise<JournalPageViewModel | null> {
  const data = await storefront.query<{
    blog?: {
      seo?: {title?: string | null; description?: string | null} | null;
      articles?: {
        nodes?: Array<{
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
            | null;
        }> | null;
      } | null;
    } | null;
  }>(JOURNAL_BLOG_QUERY, {
    variables: {blogHandle: JOURNAL_BLOG_HANDLE, first: 50},
    cache: blogCache(storefront),
  });

  if (!data.blog) return null;

  const nodes = data.blog.articles?.nodes ?? [];
  return {
    posts: nodes.map(mapShopifyArticleToPost),
    categories: JOURNAL_CATEGORIES,
    metadata: {
      title: data.blog.seo?.title ?? DEFAULT_JOURNAL_METADATA.title,
      description:
        data.blog.seo?.description ?? DEFAULT_JOURNAL_METADATA.description,
    },
  };
}

export async function getJournalPage(
  options: JournalOptions,
): Promise<JournalPageViewModel> {
  try {
    const fromShopify = await fetchShopifyJournalPosts(options.storefront);
    if (fromShopify) return fromShopify;
  } catch {
    // Storefront unavailable — optional static demo when enabled.
  }

  return options.useStatic ? staticJournalPage() : emptyJournalPage();
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
    const data = await options.storefront.query<{
      blog?: {
        articles?: {nodes?: Array<{handle: string}> | null} | null;
      } | null;
    }>(JOURNAL_BLOG_QUERY, {
      variables: {blogHandle: JOURNAL_BLOG_HANDLE, first: 100},
      cache: blogCache(options.storefront),
    });

    if (data.blog) {
      return data.blog.articles?.nodes?.map((node) => node.handle) ?? [];
    }
  } catch {
    // Storefront unavailable — optional static demo when enabled.
  }

  return options.useStatic ? Object.keys(ARTICLES) : [];
}
