import type {Route} from './+types/[sitemap.xml]';
import {getSitemapIndex} from '@shopify/hydrogen';

export async function loader({
  request,
  context: {storefront},
}: Route.LoaderArgs) {
  const baseUrl = new URL(request.url).origin;
  const response = await getSitemapIndex({
    storefront,
    request,
    customChildSitemaps: [`${baseUrl}/sitemap/editorial.xml`],
  });

  response.headers.set('Cache-Control', `max-age=${60 * 60 * 24}`);

  return response;
}
