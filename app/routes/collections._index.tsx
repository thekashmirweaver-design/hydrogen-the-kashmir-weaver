import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections._index';
import {getCollectionsPage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {CollectionsView} from '~/views/collections/CollectionsView';
import {ogMeta} from '~/lib/seo';

const COLLECTIONS_TITLE = 'Collections — The Kashmir Weaver';
const COLLECTIONS_DESC =
  'Five signature collections of hand-woven Kashmiri pashmina.';

export const meta: Route.MetaFunction = () => {
  return [
    {title: COLLECTIONS_TITLE},
    {name: 'description', content: COLLECTIONS_DESC},
    ...ogMeta({title: COLLECTIONS_TITLE, description: COLLECTIONS_DESC}),
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  return getCollectionsPage(getCatalogOptions(context));
}

export default function CollectionsRoute() {
  const data = useLoaderData<typeof loader>();
  return <CollectionsView {...data} />;
}
