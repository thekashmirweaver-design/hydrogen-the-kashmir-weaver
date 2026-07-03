import type {PageMetadata} from '~/controllers/catalog.controller';
export {
  META_DESCRIPTION_MAX,
  truncateMetaDescription,
} from '~/lib/meta-description';

export function pageMeta(metadata: PageMetadata) {
  return [
    {title: metadata.title},
    ...(metadata.description
      ? [{name: 'description' as const, content: metadata.description}]
      : []),
  ];
}

export function pageMetaWithOg(metadata: PageMetadata, image?: string) {
  return [
    ...pageMeta(metadata),
    ...ogMeta({
      title: metadata.title,
      description: metadata.description,
      image,
    }),
  ];
}

export function ogMeta(options: {
  title: string;
  description?: string;
  url?: string;
  image?: string;
  type?: string;
}) {
  const tags: Array<Record<string, string>> = [
    {property: 'og:title', content: options.title},
    {property: 'og:type', content: options.type ?? 'website'},
  ];
  if (options.description) {
    tags.push({property: 'og:description', content: options.description});
  }
  if (options.url) {
    tags.push({property: 'og:url', content: options.url});
  }
  if (options.image) {
    tags.push({property: 'og:image', content: options.image});
  }
  tags.push({name: 'twitter:card', content: 'summary_large_image'});
  tags.push({name: 'twitter:title', content: options.title});
  if (options.description) {
    tags.push({name: 'twitter:description', content: options.description});
  }
  if (options.image) {
    tags.push({name: 'twitter:image', content: options.image});
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
