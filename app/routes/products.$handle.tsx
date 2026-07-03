import {useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {getProductPage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {ogMeta} from '~/lib/seo';
import {ProductView} from '~/views/product/ProductView';

export const meta: Route.MetaFunction = ({data, location}) => {
  if (!data?.metadata) return [{title: 'The Kashmir Weaver'}];
  const image = data.product.images[0]?.src;
  return [
    {title: data.metadata.title},
    {name: 'description', content: data.metadata.description},
    ...ogMeta({
      title: data.metadata.title,
      description: data.metadata.description,
      url: location.pathname,
      image,
      type: 'product',
    }),
    {'script:ld+json': data.productLd},
    {'script:ld+json': data.breadcrumbLd},
  ];
};

export async function loader({params, context}: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response('Not found', {status: 404});
  const page = await getProductPage(handle, getCatalogOptions(context));
  if (!page) throw new Response('Not found', {status: 404});
  return page;
}

export default function ProductRoute() {
  const {product, relatedProducts} = useLoaderData<typeof loader>();
  return <ProductView product={product} relatedProducts={relatedProducts} />;
}
