import {useLoaderData} from 'react-router';
import type {Route} from './+types/heritage';
import {getHeritagePage} from '~/controllers';
import {HeritageView} from '~/views/content/HeritageView';

import {pageMetaWithOg} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  const title = data?.metadata?.title ?? 'Heritage — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return pageMetaWithOg({title, description});
};

export async function loader({context}: Route.LoaderArgs) {
  return getHeritagePage(context.storefront);
}

export default function HeritageRoute() {
  const data = useLoaderData<typeof loader>();
  return <HeritageView {...data} />;
}
