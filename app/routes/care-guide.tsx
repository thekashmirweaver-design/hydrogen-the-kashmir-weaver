import {useLoaderData} from 'react-router';
import type {Route} from './+types/care-guide';
import {getCareGuidePage} from '~/controllers';
import {CareGuideView} from '~/views/content/CareGuideView';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: data?.metadata?.title ?? 'Care Guide — The Kashmir Weaver'},
    {name: 'description', content: data?.metadata?.description},
  ];
};

export async function loader() {
  return getCareGuidePage();
}

export default function CareGuideRoute() {
  const data = useLoaderData<typeof loader>();
  return <CareGuideView {...data} />;
}
