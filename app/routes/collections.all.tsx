import {useLoaderData} from 'react-router';
import type {Route} from './+types/collections.all';
import {getShopPage} from '~/controllers';
import {ShopView} from '~/views/shop/ShopView';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Shop — The Kashmir Weaver'},
    {
      name: 'description',
      content: 'The complete atelier — every hand-woven pashmina in our archive.',
    },
  ];
};

export async function loader() {
  return getShopPage();
}

export default function ShopRoute() {
  const data = useLoaderData<typeof loader>();
  return <ShopView {...data} />;
}
