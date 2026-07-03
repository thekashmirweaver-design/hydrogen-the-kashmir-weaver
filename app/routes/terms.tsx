import {useLoaderData} from 'react-router';
import type {Route} from './+types/terms';
import {getTermsPage} from '~/controllers';
import {TermsView} from '~/views/content/TermsView';
import {pageMetaWithOg} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  const title = data?.metadata?.title ?? 'Terms — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return pageMetaWithOg({title, description});
};

export async function loader({context}: Route.LoaderArgs) {
  return getTermsPage(context.storefront);
}

export default function TermsRoute() {
  const data = useLoaderData<typeof loader>();
  return <TermsView {...data} />;
}
