import type {Route} from './+types/sitemap.editorial[.xml]';
import {getJournalOptions} from '~/lib/catalog-options';
import {listAllJournalPosts} from '~/controllers';
import {bookSections} from '~/lib/book/registry';
import type {JournalPost} from '~/models/static/journal';
import {xmlEscape} from '~/lib/xml';

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
  '/about',
  '/heritage',
  '/craft',
  '/faq',
  '/care-guide',
  '/shade-cards',
  '/concierge',
  '/book',
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

type SitemapEntry = {
  loc: string;
  lastmod: string;
  image?: {url: string};
};

function entryToXml(entry: SitemapEntry, priority: string): string {
  const parts: string[] = [`    <loc>${xmlEscape(entry.loc)}</loc>`];
  parts.push(`    <lastmod>${xmlEscape(entry.lastmod)}</lastmod>`);
  parts.push(`    <changefreq>weekly</changefreq>`);
  parts.push(`    <priority>${priority}</priority>`);
  if (entry.image) {
    // Google image sitemaps only recognise <image:loc> inside <image:image>.
    // width/height were never valid; title/caption/etc. were deprecated in 2022.
    parts.push(
      `    <image:image>\n      <image:loc>${xmlEscape(entry.image.url)}</image:loc>\n    </image:image>`,
    );
  }
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

function priorityFor(pathname: string): string {
  if (pathname === '/') return '1.0';
  if (pathname.startsWith('/journal/')) return '0.6';
  return '0.7';
}

function journalEntry(post: JournalPost, baseUrl: string): SitemapEntry {
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
    image: {
      url: imageSrc,
    },
  };
}

function staticEntry(
  pathname: string,
  baseUrl: string,
  lastmod: string,
): SitemapEntry {
  return {
    loc: `${baseUrl}${pathname}`,
    lastmod,
  };
}

export async function loader({request, context}: Route.LoaderArgs) {
  const baseUrl = new URL(request.url).origin;
  // Editorial surfaces that don't keep their own update dates get the
  // sitemap-generation date as a coarse "last seen" hint. Journal posts
  // carry their own <lastmod> via journalEntry().
  const lastmod = new Date().toISOString().split('T')[0];

  const journalOptions = getJournalOptions(context);
  const journalPosts = await listAllJournalPosts(journalOptions);

  // English-only storefront: one URL per page. Market/currency is session-
  // backed (optional one-shot `?country=`), not a distinct indexable URL.
  const staticEntries = EDITORIAL_PATHS.map((pathname) =>
    staticEntry(pathname, baseUrl, lastmod),
  );
  const journalEntries = journalPosts.map((post) =>
    journalEntry(post, baseUrl),
  );
  const bookEntries = bookSections.map((section) =>
    staticEntry(`/book/${section.slug}`, baseUrl, lastmod),
  );
  const entries = [...staticEntries, ...bookEntries, ...journalEntries];

  const urls = entries
    .map((entry) =>
      entryToXml(entry, priorityFor(entry.loc.replace(baseUrl, ''))),
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 12}`,
    },
  });
}
