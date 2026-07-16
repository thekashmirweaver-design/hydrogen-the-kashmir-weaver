import {useLoaderData} from 'react-router';
import type {Route} from './+types/about';
import {getAboutPage} from '~/controllers';
import {AboutView} from '~/views/content/AboutView';
import {
  getStoreUrlFromMatches,
  localBusinessLd,
  organizationLd,
  seoBundle,
} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const storeUrl = getStoreUrlFromMatches(matches);
  const title = data?.metadata?.title ?? 'About — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl,
    jsonLd: [organizationLd(storeUrl), localBusinessLd(storeUrl)],
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getAboutPage(context.storefront);
}

export default function AboutRoute() {
  const data = useLoaderData<typeof loader>();
  return <AboutView {...data} />;
}
