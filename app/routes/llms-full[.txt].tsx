import type {Route} from './+types/llms-full[.txt]';
import {getCatalogOptions, getJournalOptions} from '~/lib/catalog-options';
import {listAllJournalPosts} from '~/controllers';
import {buildLlmsFullFromRequest} from '~/lib/llms-full';
import {loadSharedCatalog} from '~/lib/shared-catalog';

export async function loader({request, context}: Route.LoaderArgs) {
  const catalogOptions = getCatalogOptions(context);
  const journalOptions = getJournalOptions(context);
  const [catalog, journalPosts] = await Promise.all([
    loadSharedCatalog(request, catalogOptions),
    listAllJournalPosts(journalOptions),
  ]);

  const body = buildLlmsFullFromRequest(
    request,
    catalog.products,
    catalog.collections,
    journalPosts,
  );

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'text/markdown; charset=utf-8',
      'Cache-Control': `public, max-age=${60 * 60}`,
    },
  });
}
