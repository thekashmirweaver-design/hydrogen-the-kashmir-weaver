import {useLoaderData} from 'react-router';
import type {Route} from './+types/privacy';
import {getPrivacyPage} from '~/controllers';
import {PrivacyView} from '~/views/content/PrivacyView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'Privacy — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getPrivacyPage(context.storefront);
}

export default function PrivacyRoute() {
  const data = useLoaderData<typeof loader>();
  return <PrivacyView {...data} />;
}
