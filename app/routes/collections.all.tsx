import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.all';
import {getShopPage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {ShopView} from '~/views/shop/ShopView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

const SHOP_TITLE = 'Shop — The Kashmir Weaver';
const SHOP_DESC =
  'The complete atelier — every hand-woven pashmina in our archive.';

export const meta: Route.MetaFunction = ({location, matches}) => {
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata: {title: SHOP_TITLE, description: SHOP_DESC},
    pathname: location.pathname,
    storeUrl,
  });
};

export async function loader({context}: Route.LoaderArgs) {
  const catalogOptions = getCatalogOptions(context);
  return getShopPage(catalogOptions);
}

export default function ShopRoute() {
  const {products, pageInfo} = useLoaderData<typeof loader>();
  return (
    <ShopView
      products={products}
      pageInfo={pageInfo}
      listSource={{scope: 'shop'}}
    />
  );
}
