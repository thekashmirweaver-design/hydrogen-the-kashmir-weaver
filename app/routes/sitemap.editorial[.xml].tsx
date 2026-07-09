import type {Route} from './+types/sitemap.editorial[.xml]';
import type {Storefront} from '@shopify/hydrogen';
import {getJournalOptions} from '~/lib/catalog-options';
import {listAllJournalPosts} from '~/controllers';
import type {JournalPost} from '~/models/static/journal';

/**
 * Static editorial surfaces. They share a single `lastmod` anchor below
 * (handled by the loader) — these pages rarely change and we accept the
 * approximation rather than a per-page map.
 */
const EDITORIAL_PATHS = [
  '/',
  '/collections/all',
  '/collections',
  '/journal',
  '/heritage',
  '/craft',
  '/faq',
  '/care-guide',
  '/shade-cards',
  '/concierge',
  '/terms',
  '/privacy',
  '/shipping',
  '/returns',
  '/disclaimer',
  '/policies/shipping-policy',
  '/policies/refund-policy',
  '/policies/terms-of-service',
  '/policies/privacy-policy',
];

type HreflangAlternate = {
  hreflang: string;
  href: string;
};

type SitemapEntry = {
  loc: string;
  lastmod: string;
  alternates: HreflangAlternate[];
  image?: {url: string; alt?: string | null; width?: number | null; height?: number | null};
};

const HREFLANG_QUERY = `#graphql
  query SitemapHreflang($country: CountryCode, $language: LanguageCode)
  @inContext(country: $country, language: $language) {
    localization {
      availableCountries {
        isoCode
      }
    }
  }
` as const;

type HreflangQueryResult = {
  localization?: {
    availableCountries?: Array<{isoCode?: string | null} | null> | null;
  } | null;
};

function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * The Kashmir Weaver is English-only content, so every supported Shopify
 * country ships under an `en-XX` hreflang (region-only targeting). When
 * the storefront eventually ships translated locales, this is the single
 * place to inject `de-XX`, `fr-XX`, etc.
 *
 * `x-default` points to the canonical URL with no market parameter — the
 * version users land on when no locale matches.
 */
async function loadMarketLocales(
  storefront: Storefront,
): Promise<string[]> {
  try {
    const data = await storefront.query<HreflangQueryResult>(HREFLANG_QUERY, {
      variables: {language: 'EN', country: 'US'},
      cache: storefront.CacheLong(),
    });
    const countries =
      data.localization?.availableCountries
        ?.map((c) => c?.isoCode?.trim().toUpperCase())
        .filter((cc): cc is string => !!cc) ?? [];
    return Array.from(new Set(countries)).sort();
  } catch {
    return ['US'];
  }
}

/**
 * Build per-URL hreflang alternates. `pathname` is always the canonical
 * (no `?country=`) form; the function returns one entry per supported
 * country, each appending `?country=XX`, plus an `x-default` pointing
 * at the canonical itself.
 */
function buildAlternates(
  pathname: string,
  baseUrl: string,
  locales: string[],
): HreflangAlternate[] {
  const canonical = `${baseUrl}${pathname}`;
  const variants: HreflangAlternate[] = locales.map((cc) => ({
    hreflang: `en-${cc}`,
    href: `${canonical}?country=${cc}`,
  }));
  variants.push({hreflang: 'x-default', href: canonical});
  return variants;
}

function entryToXml(entry: SitemapEntry, priority: string): string {
  const parts: string[] = [`    <loc>${xmlEscape(entry.loc)}</loc>`];
  for (const alt of entry.alternates) {
    parts.push(
      `    <xhtml:link rel="alternate" hreflang="${xmlEscape(
        alt.hreflang,
      )}" href="${xmlEscape(alt.href)}" />`,
    );
  }
  parts.push(`    <lastmod>${entry.lastmod}</lastmod>`);
  parts.push(`    <changefreq>weekly</changefreq>`);
  parts.push(`    <priority>${priority}</priority>`);
  if (entry.image) {
    const img = entry.image;
    const imgInner: string[] = [`      <image:loc>${xmlEscape(img.url)}</image:loc>`];
    if (img.alt) {
      imgInner.push(`      <image:title>${xmlEscape(img.alt)}</image:title>`);
    }
    if (img.width && img.height) {
      imgInner.push(`      <image:width>${img.width}</image:width>`);
      imgInner.push(`      <image:height>${img.height}</image:height>`);
    }
    parts.push(`    <image:image>\n${imgInner.join('\n')}\n    </image:image>`);
  }
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

function priorityFor(pathname: string): string {
  if (pathname === '/') return '1.0';
  if (pathname.startsWith('/journal/')) return '0.6';
  return '0.7';
}

function journalEntry(
  post: JournalPost,
  baseUrl: string,
  locales: string[],
): SitemapEntry {
  // Each journal post carries its own publication date — surface it as
  // <lastmod> so Google can prioritise recently-updated articles. If the
  // stored date isn't a clean YYYY-MM-DD, fall back to today so we never
  // emit a malformed <lastmod>.
  const lastmod = /^\d{4}-\d{2}-\d{2}$/.test(post.date)
    ? post.date
    : new Date().toISOString().split('T')[0];
  const pathname = `/journal/${post.slug}`;
  const imageSrc = post.img.startsWith('http')
    ? post.img
    : `${baseUrl}${post.img.startsWith('/') ? '' : '/'}${post.img}`;
  return {
    loc: `${baseUrl}${pathname}`,
    lastmod,
    alternates: buildAlternates(pathname, baseUrl, locales),
    image: {
      url: imageSrc,
      alt: post.alt ?? post.title,
      width: post.width ?? undefined,
      height: post.height ?? undefined,
    },
  };
}

function staticEntry(
  pathname: string,
  baseUrl: string,
  lastmod: string,
  locales: string[],
): SitemapEntry {
  return {
    loc: `${baseUrl}${pathname}`,
    lastmod,
    alternates: buildAlternates(pathname, baseUrl, locales),
  };
}

export async function loader({request, context}: Route.LoaderArgs) {
  const baseUrl = new URL(request.url).origin;
  // Editorial surfaces that don't keep their own update dates get the
  // sitemap-generation date as a coarse "last seen" hint. Journal posts
  // carry their own <lastmod> via journalEntry().
  const lastmod = new Date().toISOString().split('T')[0];

  const journalOptions = getJournalOptions(context);
  const [journalPosts, locales] = await Promise.all([
    listAllJournalPosts(journalOptions),
    loadMarketLocales(context.storefront),
  ]);

  const staticEntries = EDITORIAL_PATHS.map((pathname) =>
    staticEntry(pathname, baseUrl, lastmod, locales),
  );
  const journalEntries = journalPosts.map((post) =>
    journalEntry(post, baseUrl, locales),
  );
  const entries = [...staticEntries, ...journalEntries];

  const urls = entries
    .map((entry) =>
      entryToXml(entry, priorityFor(entry.loc.replace(baseUrl, ''))),
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 12}`,
    },
  });
}
