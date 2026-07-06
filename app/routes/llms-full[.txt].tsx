import type {Route} from './+types/llms-full[.txt]';
import {getCatalogOptions} from '~/lib/catalog-options';
import {buildLlmsFullFromRequest} from '~/lib/llms-full';
import {loadSharedCatalog} from '~/lib/shared-catalog';
import {getJournalPage} from '~/controllers/journal.controller';

export async function loader({request, context}: Route.LoaderArgs) {
  const catalogOptions = getCatalogOptions(context);
  const [catalog, journal] = await Promise.all([
    loadSharedCatalog(request, catalogOptions),
    getJournalPage(context.storefront),
  ]);

  const body = buildLlmsFullFromRequest(
    request,
    catalog.products,
    catalog.collections,
    journal.posts,
  );

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': `public, max-age=${60 * 60}`,
    },
  });
}
