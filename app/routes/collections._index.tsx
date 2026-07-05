import {Await, useRouteLoaderData} from 'react-router';
import type {Route} from './+types/collections._index';
import type {RootLoader} from '~/root';
import {buildCollectionsPageViewModel} from '~/controllers/shop.controller';
import {CollectionsView} from '~/views/collections/CollectionsView';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadSharedCatalog} from '~/lib/shared-catalog';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

const COLLECTIONS_TITLE = 'Collections — The Kashmir Weaver';

function collectionsIndexDescription(count: number) {
  const label = count === 1 ? 'collection' : 'collections';
  return `${count} signature ${label} of hand-woven Kashmiri pashmina.`;
}

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const count = data?.collectionCount ?? 0;
  const description = collectionsIndexDescription(count);
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata: {title: COLLECTIONS_TITLE, description},
    pathname: location.pathname,
    storeUrl,
  });
};

export async function loader({context, request}: Route.LoaderArgs) {
  const catalog = await loadSharedCatalog(request, getCatalogOptions(context));
  return {collectionCount: catalog.collections.length};
}

export default function CollectionsRoute() {
  const root = useRouteLoaderData<RootLoader>('root');
  if (!root) return null;

  return (
    <Await resolve={root.catalog}>
      {(catalog) => <CollectionsView {...buildCollectionsPageViewModel(catalog)} />}
    </Await>
  );
}
