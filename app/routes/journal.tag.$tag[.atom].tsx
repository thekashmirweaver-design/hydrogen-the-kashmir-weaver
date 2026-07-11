import type {Route} from './+types/journal.tag.$tag[.atom]';
import {serveFilteredJournalFeed} from '~/lib/feeds/journal-filtered';

export async function loader({request, context, params}: Route.LoaderArgs) {
  const tag = params.tag ?? '';
  return serveFilteredJournalFeed({
    request,
    context,
    format: 'atom',
    kind: 'tag',
    param: tag,
    selfPath: `/journal/tag/${encodeURIComponent(tag)}.atom`,
  });
}
