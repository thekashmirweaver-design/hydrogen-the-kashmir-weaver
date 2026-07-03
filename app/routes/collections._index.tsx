import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections._index';
import {getCollectionsPage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {CollectionsView} from '~/views/collections/CollectionsView';
import {ogMeta} from '~/lib/seo';

const COLLECTIONS_TITLE = 'Collections — The Kashmir Weaver';

function collectionsIndexDescription(count: number) {
  const label = count === 1 ? 'collection' : 'collections';
  return `${count} signature ${label} of hand-woven Kashmiri pashmina.`;
}

export const meta: Route.MetaFunction = ({data, location}) => {
  const count = data?.collections?.length ?? 0;
  const description = collectionsIndexDescription(count || 5);
  const image = data?.collections?.[0]?.hero.src;
  return [
    {title: COLLECTIONS_TITLE},
    {name: 'description', content: description},
    ...ogMeta({
      title: COLLECTIONS_TITLE,
      description,
      url: location.pathname,
      image,
    }),
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  return getCollectionsPage(getCatalogOptions(context));
}

export default function CollectionsRoute() {
  const data = useLoaderData<typeof loader>();
  return <CollectionsView {...data} />;
}
