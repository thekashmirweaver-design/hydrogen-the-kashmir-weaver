import type {Route} from './+types/[sitemap.xml]';
import {getSitemapIndex} from '@shopify/hydrogen';

export async function loader({
  request,
  context: {storefront},
}: Route.LoaderArgs) {
  const response = await getSitemapIndex({
    storefront,
    request,
    // Journal lives at /journal/* (editorial.xml). Exclude Shopify articles/blogs
    // sitemaps — those URLs are not canonical on this storefront.
    types: ['products', 'pages', 'collections'],
    customChildSitemaps: ['/sitemap/editorial.xml'],
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
