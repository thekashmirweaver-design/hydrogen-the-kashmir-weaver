import type {Route} from './+types/journal.category.$category[.rss]';
import {serveFilteredJournalFeed} from '~/lib/feeds/journal-filtered';

export async function loader({request, context, params}: Route.LoaderArgs) {
  const category = params.category ?? '';
  return serveFilteredJournalFeed({
    request,
    context,
    format: 'rss',
    kind: 'category',
    param: category,
    selfPath: `/journal/category/${encodeURIComponent(category)}.rss`,
  });
}
