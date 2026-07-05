import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getCollectionPage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadSharedCatalog} from '~/lib/shared-catalog';
import {CollectionView} from '~/views/collections/CollectionView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  if (!data?.metadata) return [{title: 'The Kashmir Weaver'}];
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata: data.metadata,
    pathname: location.pathname,
    storeUrl,
    image: data.collection.hero.src,
    jsonLd: [data.collectionLd, data.breadcrumbLd, data.itemListLd],
  });
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response('Not found', {status: 404});

  const catalogOptions = getCatalogOptions(context);
  const catalog = await loadSharedCatalog(request, catalogOptions);
  const page = await getCollectionPage(handle, catalogOptions, catalog);

  if (!page) throw new Response('Not found', {status: 404});

  return page;
}

export default function CollectionRoute() {
  const {collection, products} = useLoaderData<typeof loader>();
  return <CollectionView collection={collection} products={products} />;
}
