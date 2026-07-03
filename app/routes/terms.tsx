import {useLoaderData} from 'react-router';
import type {Route} from './+types/terms';
import {getTermsPage} from '~/controllers';
import {TermsView} from '~/views/content/TermsView';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: data?.metadata?.title ?? 'Terms — The Kashmir Weaver'},
    {name: 'description', content: data?.metadata?.description},
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  return getTermsPage(context.storefront);
}

export default function TermsRoute() {
  const data = useLoaderData<typeof loader>();
  return <TermsView {...data} />;
}
