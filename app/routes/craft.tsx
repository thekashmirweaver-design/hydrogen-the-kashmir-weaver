import {useLoaderData} from 'react-router';
import type {Route} from './+types/craft';
import {getCraftPage} from '~/controllers';
import {CraftView} from '~/views/content/CraftView';

import {pageMetaWithOg} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  const title = data?.metadata?.title ?? 'The Craft — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return pageMetaWithOg({title, description});
};

export async function loader({context}: Route.LoaderArgs) {
  return getCraftPage(context.storefront);
}

export default function CraftRoute() {
  const data = useLoaderData<typeof loader>();
  return <CraftView {...data} />;
}
