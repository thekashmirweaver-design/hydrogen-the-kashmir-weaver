import type {Route} from './+types/journal.author.$author[.atom]';
import {serveFilteredJournalFeed} from '~/lib/feeds/journal-filtered';

export async function loader({request, context, params}: Route.LoaderArgs) {
  const author = params.author ?? '';
  return serveFilteredJournalFeed({
    request,
    context,
    format: 'atom',
    kind: 'author',
    param: author,
    selfPath: `/journal/author/${encodeURIComponent(author)}.atom`,
  });
}
