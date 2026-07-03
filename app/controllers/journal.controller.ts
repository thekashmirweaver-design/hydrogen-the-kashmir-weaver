import {
  ARTICLES,
  JOURNAL_CATEGORIES,
  POSTS,
  type JournalArticle,
  type JournalPost,
} from '~/models/static/journal';
import type {PageMetadata} from '~/controllers/catalog.controller';

export type JournalPageViewModel = {
  posts: JournalPost[];
  categories: typeof JOURNAL_CATEGORIES;
  metadata: PageMetadata;
};

export function getJournalPage(): JournalPageViewModel {
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

export type ArticlePageViewModel = {
  slug: string;
  article: JournalArticle;
  metadata: PageMetadata;
};

export function getArticlePage(slug: string): ArticlePageViewModel | null {
  const article = ARTICLES[slug];
  if (!article) return null;

  return {
    slug,
    article,
    metadata: {
      title: `${article.title} — Journal — The Kashmir Weaver`,
      description: article.body[0],
    },
  };
}

export function listArticleSlugs(): string[] {
  return Object.keys(ARTICLES);
}
