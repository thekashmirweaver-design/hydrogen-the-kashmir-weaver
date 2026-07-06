import {useLoaderData} from 'react-router';
import type {Route} from './+types/faq';
import {getFaqPage} from '~/controllers';
import {FaqView} from '~/views/content/FaqView';
import {faqPageLd, getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data, location, matches}) => {
  const title = data?.metadata?.title ?? 'FAQ — The Kashmir Weaver';
  const description = data?.metadata?.description;
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata: {title, description},
    pathname: location.pathname,
    storeUrl,
    jsonLd: data?.faqs?.length ? [faqPageLd(data.faqs)] : [],
  });
};

export async function loader({context}: Route.LoaderArgs) {
  return getFaqPage(context.storefront);
}

export default function FaqRoute() {
  const data = useLoaderData<typeof loader>();
  return <FaqView {...data} />;
}
