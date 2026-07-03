import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.all';
import {getShopPage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {ShopView} from '~/views/shop/ShopView';
import {ogMeta} from '~/lib/seo';

const SHOP_TITLE = 'Shop — The Kashmir Weaver';
const SHOP_DESC =
  'The complete atelier — every hand-woven pashmina in our archive.';

export const meta: Route.MetaFunction = () => {
  return [
    {title: SHOP_TITLE},
    {name: 'description', content: SHOP_DESC},
    ...ogMeta({title: SHOP_TITLE, description: SHOP_DESC}),
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  return getShopPage(getCatalogOptions(context));
}

export default function ShopRoute() {
  const data = useLoaderData<typeof loader>();
  return <ShopView {...data} />;
}
