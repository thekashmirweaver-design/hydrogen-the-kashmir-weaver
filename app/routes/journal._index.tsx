import {useLoaderData} from 'react-router';
import type {Route} from './+types/journal._index';
import {getJournalPage} from '~/controllers';
import {getJournalOptions} from '~/lib/catalog-options';
import {JournalView} from '~/views/journal/JournalView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const metadata = data?.metadata ?? {
    title: 'Journal — The Kashmir Weaver',
    description:
      'Stories of heritage, craft, and quiet luxury from Kashmir.',
  };
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata,
    pathname: location.pathname,
    storeUrl,
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getJournalPage(getJournalOptions(context));
}

export default function JournalRoute() {
  const data = useLoaderData<typeof loader>();
  return <JournalView {...data} />;
}
