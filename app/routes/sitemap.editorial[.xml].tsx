import type {Route} from './+types/sitemap.editorial[.xml]';
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
  '/policies/shipping-policy',
  '/policies/refund-policy',
  '/policies/terms-of-service',
  '/policies/privacy-policy',
];

async function journalArticlePaths(
  storefront: Route.LoaderArgs['context']['storefront'],
): Promise<string[]> {
  try {
    const {blog} = await storefront.query(JOURNAL_BLOG_QUERY, {
      variables: {blogHandle: JOURNAL_BLOG_HANDLE, first: 250},
    });
    if (blog?.articles?.nodes?.length) {
      return blog.articles.nodes.map(
        (article: {handle: string}) => `/journal/${article.handle}`,
      );
    }
  } catch {
    // Fall back to static journal posts when Storefront API is unavailable.
  }
  return POSTS.map((post) => `/journal/${post.slug}`);
}

export async function loader({request, context}: Route.LoaderArgs) {
  const baseUrl = new URL(request.url).origin;
  const lastmod = new Date().toISOString().split('T')[0];
  const articlePaths = await journalArticlePaths(context.storefront);
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
