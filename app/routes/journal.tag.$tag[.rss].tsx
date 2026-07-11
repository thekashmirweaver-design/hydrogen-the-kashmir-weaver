import type {Route} from './+types/journal.tag.$tag[.rss]';
import {serveFilteredJournalFeed} from '~/lib/feeds/journal-filtered';

export async function loader({request, context, params}: Route.LoaderArgs) {
  const tag = params.tag ?? '';
  return serveFilteredJournalFeed({
    request,
    context,
    format: 'rss',
    kind: 'tag',
    param: tag,
    selfPath: `/journal/tag/${encodeURIComponent(tag)}.rss`,
  });
}
