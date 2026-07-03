import {useLoaderData} from 'react-router';
import type {Route} from './+types/privacy';
import {getPrivacyPage} from '~/controllers';
import {PrivacyView} from '~/views/content/PrivacyView';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: data?.metadata?.title ?? 'Privacy — The Kashmir Weaver'},
    {name: 'description', content: data?.metadata?.description},
  ];
};

export async function loader() {
  return getPrivacyPage();
}

export default function PrivacyRoute() {
  const data = useLoaderData<typeof loader>();
  return <PrivacyView {...data} />;
}
