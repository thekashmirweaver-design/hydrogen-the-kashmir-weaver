import type {Storefront} from '@shopify/hydrogen';
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

function mapCategory(tags: string[] | null | undefined): JournalCategory {
  const match = tags?.find((tag) => VALID_CATEGORIES.has(tag));
  return (match as JournalCategory | undefined) ?? 'Heritage';
}

function resolveReadMinutes(slug: string, bodyText: string): number {
  return POSTS.find((p) => p.slug === slug)?.minutes ?? estimateReadMinutes(bodyText);
}

function mapShopifyArticleToPost(article: {
  handle: string;
  title: string;
  excerpt?: string | null;
  contentHtml?: string | null;
  publishedAt?: string | null;
  tags?: string[] | null;
  image?: {url?: string | null} | null;
}): JournalPost {
  const bodyText = htmlToPlainText(article.contentHtml);
  return {
    slug: article.handle,
    cat: mapCategory(article.tags),
    title: article.title,
    excerpt: article.excerpt?.trim() || bodyText.slice(0, 160).trim(),
    img: article.image?.url ?? '/assets/journal-craft.jpg',
    minutes: resolveReadMinutes(article.handle, bodyText),
    date: article.publishedAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  };
}

function mapShopifyArticleToArticle(article: {
  handle: string;
  title: string;
  contentHtml?: string | null;
  tags?: string[] | null;
  image?: {url?: string | null} | null;
}): JournalArticle {
  const bodyHtml = article.contentHtml?.trim() || undefined;
  const bodyText = htmlToPlainText(bodyHtml);
  return {
    title: article.title,
    cat: mapCategory(article.tags),
    minutes: resolveReadMinutes(article.handle, bodyText),
    img: article.image?.url ?? '/assets/journal-craft.jpg',
    bodyHtml,
  };
}

export async function getJournalPage(
  storefront?: Storefront,
): Promise<JournalPageViewModel> {
  if (storefront) {
    try {
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
              image?: {url?: string | null} | null;
            }> | null;
          } | null;
        } | null;
      }>(JOURNAL_BLOG_QUERY, {
        variables: {blogHandle: JOURNAL_BLOG_HANDLE, first: 50},
      });

      const nodes = data.blog?.articles?.nodes;
      if (nodes?.length) {
        return {
          posts: nodes.map(mapShopifyArticleToPost),
          categories: JOURNAL_CATEGORIES,
          metadata: {
            title: data.blog?.seo?.title ?? 'Journal — The Kashmir Weaver',
            description:
              data.blog?.seo?.description ??
              'Stories from the valley — heritage, craft, care, and the quiet luxury of Kashmiri pashmina.',
          },
        };
      }
    } catch {
      // Fall back to static content
    }
  }

  return {
    posts: POSTS,
    categories: JOURNAL_CATEGORIES,
    metadata: {
      title: 'Journal — The Kashmir Weaver',
      description:
        'Stories from the valley — heritage, craft, care, and the quiet luxury of Kashmiri pashmina.',
    },
  };
}

export async function getArticlePage(
  slug: string,
  storefront?: Storefront,
): Promise<ArticlePageViewModel | null> {
  if (storefront) {
    try {
      const data = await storefront.query<{
        blog?: {
          articleByHandle?: {
            handle: string;
            title: string;
            contentHtml?: string | null;
            publishedAt?: string | null;
            tags?: string[] | null;
            image?: {url?: string | null} | null;
            seo?: {title?: string | null; description?: string | null} | null;
          } | null;
        } | null;
      }>(JOURNAL_ARTICLE_QUERY, {
        variables: {
          blogHandle: JOURNAL_BLOG_HANDLE,
          articleHandle: slug,
        },
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
      // Fall back to static content
    }
  }

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

export async function listArticleSlugs(storefront?: Storefront): Promise<string[]> {
  if (storefront) {
    try {
      const data = await storefront.query<{
        blog?: {
          articles?: {nodes?: Array<{handle: string}> | null} | null;
        } | null;
      }>(JOURNAL_BLOG_QUERY, {
        variables: {blogHandle: JOURNAL_BLOG_HANDLE, first: 100},
      });

      const handles = data.blog?.articles?.nodes?.map((node) => node.handle);
      if (handles?.length) return handles;
    } catch {
      // Fall back to static slugs
    }
  }

  return Object.keys(ARTICLES);
}
