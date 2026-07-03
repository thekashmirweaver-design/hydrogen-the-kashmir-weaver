import {useLoaderData} from 'react-router';
import type {Route} from './+types/journal._index';
import {getJournalPage} from '~/controllers';
import {JournalView} from '~/views/journal/JournalView';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Journal — The Kashmir Weaver'},
    {
      name: 'description',
      content: 'Stories of heritage, craft, and quiet luxury from Kashmir.',
    },
  ];
};

export async function loader() {
  return getJournalPage();
}

export default function JournalRoute() {
  const data = useLoaderData<typeof loader>();
  return <JournalView {...data} />;
}
