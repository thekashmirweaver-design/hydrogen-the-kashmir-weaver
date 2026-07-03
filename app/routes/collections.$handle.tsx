import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.$handle';
import {getCollectionPage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {CollectionView} from '~/views/collections/CollectionView';
import {ogMeta} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location}) => {
  if (!data?.metadata) return [{title: 'The Kashmir Weaver'}];
  return [
    {title: data.metadata.title},
    {name: 'description', content: data.metadata.description},
    ...ogMeta({
      title: data.metadata.title,
      description: data.metadata.description,
      url: location.pathname,
      image: data.collection.hero.src,
      type: 'website',
    }),
    {'script:ld+json': data.collectionLd},
    {'script:ld+json': data.breadcrumbLd},
  ];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response('Not found', {status: 404});

  const catalogOptions = getCatalogOptions(context);
  const page = await getCollectionPage(handle, catalogOptions);

  if (!page) throw new Response('Not found', {status: 404});

  return page;
}

export default function CollectionRoute() {
  const {collection, products} = useLoaderData<typeof loader>();
  return <CollectionView collection={collection} products={products} />;
}
