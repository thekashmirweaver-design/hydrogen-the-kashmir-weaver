import type {Route} from './+types/sitemap.editorial[.xml]';
import {getJournalOptions} from '~/lib/catalog-options';
import {listAllJournalPosts} from '~/controllers';

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

async function journalArticlePaths(
  context: Route.LoaderArgs['context'],
): Promise<string[]> {
  const journalOptions = getJournalOptions(context);
  const posts = await listAllJournalPosts(journalOptions);
  return posts.map((post) => `/journal/${post.slug}`);
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
