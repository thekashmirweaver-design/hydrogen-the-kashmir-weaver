import {Await, useRouteLoaderData} from 'react-router';
import type {Route} from './+types/collections.all';
import type {RootLoader} from '~/root';
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

export async function loader() {
  return null;
}

export default function ShopRoute() {
  const root = useRouteLoaderData<RootLoader>('root');
  if (!root) return null;

  return (
    <Await resolve={root.catalog}>
      {(catalog) => <ShopView products={catalog.products} />}
    </Await>
  );
}
