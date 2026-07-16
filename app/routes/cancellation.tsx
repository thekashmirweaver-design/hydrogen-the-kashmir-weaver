import {useLoaderData} from 'react-router';
import type {Route} from './+types/cancellation';
import {getCancellationPage} from '~/controllers';
import {CancellationView} from '~/views/content/CancellationView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'Cancellation Policy — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getCancellationPage(context.storefront);
}

export default function CancellationRoute() {
  const data = useLoaderData<typeof loader>();
  return <CancellationView {...data} />;
}
