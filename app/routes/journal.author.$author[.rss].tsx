import type {Route} from './+types/journal.author.$author[.rss]';
import {serveFilteredJournalFeed} from '~/lib/feeds/journal-filtered';

export async function loader({request, context, params}: Route.LoaderArgs) {
  const author = params.author ?? '';
  return serveFilteredJournalFeed({
    request,
    context,
    format: 'rss',
    kind: 'author',
    param: author,
    selfPath: `/journal/author/${encodeURIComponent(author)}.rss`,
  });
}
