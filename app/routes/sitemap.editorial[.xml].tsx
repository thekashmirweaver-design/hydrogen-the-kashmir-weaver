import type {Route} from './+types/sitemap.editorial[.xml]';
import {getJournalOptions} from '~/lib/catalog-options';
import {blogCache} from '~/lib/storefront-cache';
import {
  JOURNAL_BLOG_HANDLE,
  JOURNAL_BLOG_QUERY,
} from '~/models/shopify/journal.queries';
import {POSTS} from '~/models/static/journal';

const EDITORIAL_PATHS = [
  '/',
  '/collections/all',
  '/collections',
  '/journal',
  '/heritage',
  '/craft',
  '/faq',
  '/care-guide',
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

async function journalArticlePaths(
  context: Route.LoaderArgs['context'],
): Promise<string[]> {
  const {useStatic} = getJournalOptions(context);
  try {
    const {blog} = await context.storefront.query(JOURNAL_BLOG_QUERY, {
      variables: {blogHandle: JOURNAL_BLOG_HANDLE, first: 250},
      cache: blogCache(context.storefront),
    });
    if (blog) {
      return (blog.articles?.nodes ?? []).map(
        (article: {handle: string}) => `/journal/${article.handle}`,
      );
    }
  } catch {
    // Storefront unavailable — optional static demo when enabled.
  }
  return useStatic ? POSTS.map((post) => `/journal/${post.slug}`) : [];
}

export async function loader({request, context}: Route.LoaderArgs) {
  const baseUrl = new URL(request.url).origin;
  const lastmod = new Date().toISOString().split('T')[0];
  const articlePaths = await journalArticlePaths(context);
  const paths = [...EDITORIAL_PATHS, ...articlePaths];

  const urls = paths
    .map(
      (path) => `  <url>
    <loc>${baseUrl}${path}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${path === '/' ? '1.0' : path.startsWith('/journal/') ? '0.6' : '0.7'}</priority>
  </url>`,
    )
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': `max-age=${60 * 60 * 24}`,
    },
  });
}
