import {useLoaderData} from 'react-router';
import type {Route} from './+types/terms';
import {getTermsPage} from '~/controllers';
import {TermsView} from '~/views/content/TermsView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'Terms — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getTermsPage(context.storefront);
}

export default function TermsRoute() {
  const data = useLoaderData<typeof loader>();
  return <TermsView {...data} />;
}
