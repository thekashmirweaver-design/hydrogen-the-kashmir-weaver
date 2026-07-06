import {useLoaderData} from 'react-router';
import type {Route} from './+types/disclaimer';
import {getDisclaimerPage} from '~/controllers';
import {DisclaimerView} from '~/views/content/DisclaimerView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'Disclaimer — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getDisclaimerPage(context.storefront);
}

export default function DisclaimerRoute() {
  const data = useLoaderData<typeof loader>();
  return <DisclaimerView {...data} />;
}
