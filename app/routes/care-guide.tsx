import {useLoaderData} from 'react-router';
import type {Route} from './+types/care-guide';
import {getCareGuidePage} from '~/controllers';
import {CareGuideView} from '~/views/content/CareGuideView';

import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'Care Guide — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getCareGuidePage(context.storefront);
}

export default function CareGuideRoute() {
  const data = useLoaderData<typeof loader>();
  return <CareGuideView {...data} />;
}
