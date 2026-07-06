import {useLoaderData} from 'react-router';
import type {Route} from './+types/shipping';
import {getShippingPage} from '~/controllers';
import {ShippingView} from '~/views/content/ShippingView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'Shipping — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getShippingPage(context.storefront);
}

export default function ShippingRoute() {
  const data = useLoaderData<typeof loader>();
  return <ShippingView {...data} />;
}
