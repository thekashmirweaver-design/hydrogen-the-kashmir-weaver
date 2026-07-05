import {useLoaderData} from 'react-router';
import type {Route} from './+types/products.$handle';
import {getProductPage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {loadSharedCatalog} from '~/lib/shared-catalog';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';
import {ProductView} from '~/views/product/ProductView';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  if (!data?.metadata) return [{title: 'The Kashmir Weaver'}];
  const storeUrl = getStoreUrlFromMatches(matches);
  const image = data.product.images[0]?.src;
  return seoBundle({
    metadata: data.metadata,
    pathname: location.pathname,
    storeUrl,
    image,
    type: 'product',
    jsonLd: [data.productLd, data.breadcrumbLd],
  });
};

export async function loader({params, context, request}: Route.LoaderArgs) {
  const handle = params.handle;
  if (!handle) throw new Response('Not found', {status: 404});
  const catalogOptions = getCatalogOptions(context);
  const catalog = await loadSharedCatalog(request, catalogOptions);
  const page = await getProductPage(handle, catalogOptions, catalog);
  if (!page) throw new Response('Not found', {status: 404});
  return page;
}

export default function ProductRoute() {
  const {product, relatedProducts} = useLoaderData<typeof loader>();
  return <ProductView product={product} relatedProducts={relatedProducts} />;
}
