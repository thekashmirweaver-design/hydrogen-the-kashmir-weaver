import type {Collection, Product} from '~/models/types';
import type {JournalPost} from '~/models/static/journal';

const SITE = 'The Kashmir Weaver';
const DEFAULT_ORIGIN = 'https://thekashmirweaver.shop';

function originFromRequest(request: Request): string {
  try {
    return new URL(request.url).origin;
  } catch {
    return DEFAULT_ORIGIN;
  }
}

function abs(origin: string, path: string): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return `${origin.replace(/\/$/, '')}${normalized}`;
}

function note(text: string | undefined, max = 140): string {
  const trimmed = text?.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}

function mdLink(origin: string, path: string, label: string, description?: string) {
  const suffix = description ? `: ${description}` : '';
  return `- [${label}](${abs(origin, path)})${suffix}`;
}

export function buildLlmsFullDocument(options: {
  origin: string;
  products: Product[];
  collections: Collection[];
  journalPosts: JournalPost[];
}): string {
  const {origin, products, collections, journalPosts} = options;

  const lines: string[] = [
    `# ${SITE}`,
    '',
    '> Extended machine-readable catalog for AI agents and LLMs. For a curated overview, see /llms.txt.',
    '',
    'This file lists every published product, collection, and journal article currently available on the storefront. Prices and inventory change in Shopify — follow links for live data.',
    '',
    '## Products',
    '',
  ];

  if (products.length) {
    for (const product of products) {
      const desc =
        note(product.shortDescription) ||
        note(product.description) ||
        product.collectionName;
      lines.push(
        mdLink(
          origin,
          `/products/${product.handle}`,
          product.name,
          desc,
        ),
      );
    }
  } else {
    lines.push('- _(No products in catalog snapshot)_');
  }

  lines.push('', '## Collections', '');

  if (collections.length) {
    for (const collection of collections) {
      lines.push(
        mdLink(
          origin,
          `/collections/${collection.handle}`,
          collection.name,
          note(collection.tagline) || note(collection.story),
        ),
      );
    }
  } else {
    lines.push('- _(No collections in catalog snapshot)_');
  }

  lines.push('', '## Journal', '');

  if (journalPosts.length) {
    for (const post of journalPosts) {
      lines.push(
        mdLink(
          origin,
          `/journal/${post.slug}`,
          post.title,
          `${post.cat} — ${note(post.excerpt)}`,
        ),
      );
    }
  } else {
    lines.push('- _(No journal articles)_');
  }

  lines.push('', '## Editorial pages', '');
  const editorial: Array<[string, string, string?]> = [
    ['/', 'Home'],
    ['/collections/all', 'All products'],
    ['/collections', 'Collections index'],
    ['/heritage', 'Heritage'],
    ['/craft', 'The craft'],
    ['/faq', 'FAQ'],
    ['/care-guide', 'Care guide'],
    ['/concierge', 'Concierge — custom orders and gifting'],
    ['/search', 'Search'],
    ['/terms', 'Terms of service'],
    ['/privacy', 'Privacy policy'],
    ['/shipping', 'Shipping policy'],
    ['/returns', 'Returns policy'],
    ['/disclaimer', 'Disclaimer'],
    ['/policies/shipping-policy', 'Shipping policy (Shopify handle)'],
    ['/policies/refund-policy', 'Refund policy'],
  ];
  for (const [path, label, desc] of editorial) {
    lines.push(mdLink(origin, path, label, desc));
  }

  lines.push('', '## Optional', '');
  lines.push(mdLink(origin, '/llms.txt', 'Curated llms.txt', 'Short agent overview'));
  lines.push(mdLink(origin, '/sitemap.xml', 'Sitemap index', 'All indexable URLs'));
  lines.push('');

  return lines.join('\n');
}

export function buildLlmsFullFromRequest(
  request: Request,
  products: Product[],
  collections: Collection[],
  journalPosts: JournalPost[],
): string {
  return buildLlmsFullDocument({
    origin: originFromRequest(request),
    products,
    collections,
    journalPosts,
  });
}
