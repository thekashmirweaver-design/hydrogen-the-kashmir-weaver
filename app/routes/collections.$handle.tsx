import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getCollectionPage, getCollectionMetadata} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {CollectionView} from '~/views/collections/CollectionView';
import {ogMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  if (!data?.metadata) return [{title: 'The Kashmir Weaver'}];
  return [
    {title: data.metadata.title},
    {name: 'description', content: data.metadata.description},
    ...ogMeta({
      title: data.metadata.title,
      description: data.metadata.description,
    }),
  ];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response('Not found', {status: 404});

  const catalogOptions = getCatalogOptions(context);
  const [page, metadata] = await Promise.all([
    getCollectionPage(handle, catalogOptions),
    getCollectionMetadata(handle, catalogOptions),
  ]);

  if (!page) throw new Response('Not found', {status: 404});

  return {...page, metadata};
}

export default function CollectionRoute() {
  const {collection, products} = useLoaderData<typeof loader>();
  return <CollectionView collection={collection} products={products} />;
}
