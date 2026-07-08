import type {PageMetadata} from '~/controllers/catalog.controller';
export {
  META_DESCRIPTION_MAX,
  truncateMetaDescription,
} from '~/lib/meta-description';

const DEFAULT_STORE_URL = 'https://thekashmirweaver.shop';
const SITE_NAME = 'The Kashmir Weaver';

/** Oxygen preview deployments — never canonical storefront URLs. */
const OXYGEN_PREVIEW_HOST = /\.o2\.myshopify\.dev$/i;

/** Live custom domains that should win over stale Oxygen env values. */
const LIVE_STOREFRONT_HOSTS = new Set([
  'thekashmirweaver.shop',
  'www.thekashmirweaver.shop',
]);

export type MetaDescriptor = Record<string, string>;

function normalizeStoreUrl(url?: string | null): string | null {
  const trimmed = url?.trim().replace(/\/$/, '');
  if (!trimmed) return null;
  try {
    return new URL(trimmed).origin;
  } catch {
    return null;
  }
}

function isOxygenPreviewUrl(url: string): boolean {
  try {
    return OXYGEN_PREVIEW_HOST.test(new URL(url).hostname);
  } catch {
    return false;
  }
}

/**
 * Canonical storefront origin for SEO, checkout return links, and analytics.
 *
 * Prefers the live request host on custom domains, rejects Oxygen preview URLs
 * from PUBLIC_STORE_URL, and falls back to thekashmirweaver.shop.
 */
export function resolveStoreUrl(
  storeUrl?: string | null,
  requestUrl?: string,
): string {
  const requestOrigin = requestUrl ? normalizeStoreUrl(requestUrl) : null;
  if (requestOrigin) {
    const requestHost = new URL(requestOrigin).hostname.toLowerCase();
    if (LIVE_STOREFRONT_HOSTS.has(requestHost)) {
      return requestOrigin;
    }
  }

  const envOrigin = normalizeStoreUrl(storeUrl);
  if (envOrigin && !isOxygenPreviewUrl(envOrigin)) {
    return envOrigin;
  }

  if (requestOrigin && !isOxygenPreviewUrl(requestOrigin)) {
    return requestOrigin;
  }

  return DEFAULT_STORE_URL;
}

export function canonicalPathname(pathname: string): string {
  const path = pathname.split('?')[0] || '/';
  return path.startsWith('/') ? path : `/${path}`;
}

export function absoluteUrl(pathname: string, storeUrl: string): string {
  const path = canonicalPathname(pathname);
  return `${storeUrl.replace(/\/$/, '')}${path}`;
}

export function absoluteImageUrl(
  image: string | undefined,
  storeUrl: string,
): string | undefined {
  if (!image) return undefined;
  if (image.startsWith('http://') || image.startsWith('https://')) return image;
  return absoluteUrl(image, storeUrl);
}

export function getStoreUrlFromMatches(
  matches: ReadonlyArray<{id: string; data?: unknown} | undefined>,
): string {
  const root = matches.find((match) => match?.id === 'root')?.data as
    | {publicStoreUrl?: string}
    | undefined;
  return resolveStoreUrl(root?.publicStoreUrl);
}

export function canonicalLink(
  pathname: string,
  storeUrl: string,
): MetaDescriptor {
  return {
    tagName: 'link',
    rel: 'canonical',
    href: absoluteUrl(pathname, storeUrl),
  };
}

export function noindexMeta(): MetaDescriptor[] {
  return [{name: 'robots', content: 'noindex, nofollow'}];
}

export function pageMeta(metadata: PageMetadata) {
  return [
    {title: metadata.title},
    ...(metadata.description
      ? [{name: 'description' as const, content: metadata.description}]
      : []),
  ];
}

export function ogMeta(options: {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
  storeUrl?: string;
}) {
  const storeUrl = resolveStoreUrl(options.storeUrl);
  const tags: Array<Record<string, string>> = [
    {property: 'og:title', content: options.title},
    {property: 'og:type', content: options.type ?? 'website'},
    {property: 'og:site_name', content: SITE_NAME},
  ];
  if (options.description) {
    tags.push({property: 'og:description', content: options.description});
  }
  if (options.url) {
    tags.push({
      property: 'og:url',
      content: absoluteUrl(options.url, storeUrl),
    });
  }
  const image = absoluteImageUrl(options.image, storeUrl);
  if (image) {
    tags.push({property: 'og:image', content: image});
  }
  tags.push({name: 'twitter:card', content: 'summary_large_image'});
  tags.push({name: 'twitter:title', content: options.title});
  if (options.description) {
    tags.push({name: 'twitter:description', content: options.description});
  }
  if (image) {
    tags.push({name: 'twitter:image', content: image});
  }
  return tags;
}

export function pageMetaWithOg(
  metadata: PageMetadata,
  image?: string,
  options?: {
    pathname?: string;
    storeUrl?: string;
    type?: string;
  },
) {
  return seoBundle({
    metadata,
    pathname: options?.pathname,
    storeUrl: options?.storeUrl,
    image,
    type: options?.type,
  });
}

export function absolutizeJsonLd(
  data: Record<string, unknown>,
  storeUrl: string,
): Record<string, unknown> {
  const absolutizeValue = (value: unknown): unknown => {
    if (typeof value === 'string' && value.startsWith('/')) {
      return absoluteUrl(value, storeUrl);
    }
    if (Array.isArray(value)) {
      return value.map(absolutizeValue);
    }
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value as Record<string, unknown>).map(([key, nested]) => {
          if (
            (key === 'item' || key === 'url' || key === '@id') &&
            typeof nested === 'string' &&
            nested.startsWith('/')
          ) {
            return [key, absoluteUrl(nested, storeUrl)];
          }
          return [key, absolutizeValue(nested)];
        }),
      );
    }
    return value;
  };

  return absolutizeValue(data) as Record<string, unknown>;
}

export function seoBundle(options: {
  metadata: PageMetadata;
  pathname?: string;
  storeUrl?: string;
  image?: string;
  type?: string;
  jsonLd?: Array<Record<string, unknown>>;
  robots?: 'noindex';
}) {
  const storeUrl = resolveStoreUrl(options.storeUrl);
  const tags: Array<Record<string, unknown>> = [
    ...pageMeta(options.metadata),
    ...ogMeta({
      title: options.metadata.title,
      description: options.metadata.description,
      url: options.pathname,
      image: options.image,
      type: options.type,
      storeUrl,
    }),
  ];

  if (options.pathname) {
    tags.unshift(canonicalLink(options.pathname, storeUrl));
  }

  if (options.robots === 'noindex') {
    tags.push(...noindexMeta());
  }

  for (const ld of options.jsonLd ?? []) {
    tags.push({
      'script:ld+json': absolutizeJsonLd(ld, storeUrl),
    });
  }

  return tags;
}

export function jsonLdScript(data: Record<string, unknown>) {
  return {
    'script:ld+json': data,
  };
}

export function faqPageLd(items: Array<{q: string; a: string}>) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: {
        '@type': 'Answer',
        text: item.a,
      },
    })),
  };
}

export function organizationLd(storeUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: storeUrl,
    logo: absoluteUrl('/assets/brand-mark.png', storeUrl),
    sameAs: [],
  };
}

export function websiteLd(storeUrl: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: storeUrl,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${storeUrl}/search?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function blogPostingLd(options: {
  title: string;
  description?: string;
  url: string;
  image?: string;
  datePublished?: string;
  storeUrl: string;
}) {
  const storeUrl = resolveStoreUrl(options.storeUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: options.title,
    description: options.description,
    url: absoluteUrl(options.url, storeUrl),
    image: absoluteImageUrl(options.image, storeUrl),
    datePublished: options.datePublished,
    author: {
      '@type': 'Organization',
      name: SITE_NAME,
    },
    publisher: {
      '@type': 'Organization',
      name: SITE_NAME,
      logo: {
        '@type': 'ImageObject',
        url: absoluteUrl('/assets/brand-mark.png', storeUrl),
      },
    },
  };
}

export function itemListLd(options: {
  name: string;
  url: string;
  items: Array<{name: string; url: string}>;
  storeUrl: string;
}) {
  const storeUrl = resolveStoreUrl(options.storeUrl);
  return {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: options.name,
    url: absoluteUrl(options.url, storeUrl),
    itemListElement: options.items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      url: absoluteUrl(item.url, storeUrl),
    })),
  };
}
