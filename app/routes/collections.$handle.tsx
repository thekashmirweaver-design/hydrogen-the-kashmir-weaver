import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getCollectionPage, getCollectionMetadata} from '~/controllers';
import {CollectionView} from '~/views/collections/CollectionView';

export const meta: Route.MetaFunction = ({data}) => {
  if (!data?.metadata) return [{title: 'The Kashmir Weaver'}];
  return [
    {title: data.metadata.title},
    {name: 'description', content: data.metadata.description},
  ];
};

export async function loader({params}: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response('Not found', {status: 404});

  const [page, metadata] = await Promise.all([
    getCollectionPage(handle),
    getCollectionMetadata(handle),
  ]);

  if (!page) throw new Response('Not found', {status: 404});

  return {...page, metadata};
}

export default function CollectionRoute() {
  const {collection, products} = useLoaderData<typeof loader>();
  return <CollectionView collection={collection} products={products} />;
}
