import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections._index';
import {getCollectionsPage} from '~/controllers';
import {CollectionsView} from '~/views/collections/CollectionsView';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Collections — The Kashmir Weaver'},
    {
      name: 'description',
      content: 'Five signature collections of hand-woven Kashmiri pashmina.',
    },
  ];
};

export async function loader() {
  return getCollectionsPage();
}

export default function CollectionsRoute() {
  const data = useLoaderData<typeof loader>();
  return <CollectionsView {...data} />;
}
