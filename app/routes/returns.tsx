import {useLoaderData} from 'react-router';
import type {Route} from './+types/returns';
import {getRefundPage} from '~/controllers';
import {RefundView} from '~/views/content/RefundView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'Returns — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getRefundPage(context.storefront);
}

export default function ReturnsRoute() {
  const data = useLoaderData<typeof loader>();
  return <RefundView {...data} />;
}
