import {useLoaderData} from 'react-router';
import type {Route} from './+types/journal._index';
import {getJournalPage} from '~/controllers';
import {JournalView} from '~/views/journal/JournalView';
import {ogMeta} from '~/lib/seo';

const JOURNAL_TITLE = 'Journal — The Kashmir Weaver';
const JOURNAL_DESC =
  'Stories of heritage, craft, and quiet luxury from Kashmir.';

export const meta: Route.MetaFunction = () => {
  return [
    {title: JOURNAL_TITLE},
    {name: 'description', content: JOURNAL_DESC},
    ...ogMeta({title: JOURNAL_TITLE, description: JOURNAL_DESC}),
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  return getJournalPage(context.storefront);
}

export default function JournalRoute() {
  const data = useLoaderData<typeof loader>();
  return <JournalView {...data} />;
}
