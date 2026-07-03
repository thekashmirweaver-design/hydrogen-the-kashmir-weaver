import {useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {getProductPage} from '~/controllers';
import {ProductView} from '~/views/product/ProductView';

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
  const page = await getProductPage(handle);
  if (!page) throw new Response('Not found', {status: 404});
  return page;
}

export default function ProductRoute() {
  const {product, relatedProducts} = useLoaderData<typeof loader>();
  return <ProductView product={product} relatedProducts={relatedProducts} />;
}
