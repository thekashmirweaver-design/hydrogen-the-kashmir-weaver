import {useLoaderData} from 'react-router';
import type {Route} from './+types/care-guide';
import {getCareGuidePage} from '~/controllers';
import {CareGuideView} from '~/views/content/CareGuideView';

import {pageMetaWithOg} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  const title = data?.metadata?.title ?? 'Care Guide — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return pageMetaWithOg({title, description});
};

export async function loader({context}: Route.LoaderArgs) {
  return getCareGuidePage(context.storefront);
}

export default function CareGuideRoute() {
  const data = useLoaderData<typeof loader>();
  return <CareGuideView {...data} />;
}
