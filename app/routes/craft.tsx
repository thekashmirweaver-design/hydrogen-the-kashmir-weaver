import {useLoaderData} from 'react-router';
import type {Route} from './+types/craft';
import {getCraftPage} from '~/controllers';
import {CraftView} from '~/views/content/CraftView';

import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'The Craft — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getCraftPage(context.storefront);
}

export default function CraftRoute() {
  const data = useLoaderData<typeof loader>();
  return <CraftView {...data} />;
}
