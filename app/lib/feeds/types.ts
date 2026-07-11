export type FeedImage = {
  url: string;
  title?: string;
};

export type FeedItem = {
  title: string;
  link: string;
  /** Stable unique id (permalink URL for journal/products). */
  id: string;
  summary: string;
  contentHtml?: string;
  publishedAt: string;
  author: string;
  categories: string[];
  image?: FeedImage;
};

export type FeedChannel = {
  title: string;
  link: string;
  description: string;
  /** Absolute self URL of this feed document. */
  selfUrl: string;
  language?: string;
};
