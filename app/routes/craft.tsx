import {useLoaderData} from 'react-router';
import type {Route} from './+types/craft';
import {getCraftPage} from '~/controllers';
import {CraftView} from '~/views/content/CraftView';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: data?.metadata?.title ?? 'The Craft — The Kashmir Weaver'},
    {name: 'description', content: data?.metadata?.description},
  ];
};

export async function loader() {
  return getCraftPage();
}

export default function CraftRoute() {
  const data = useLoaderData<typeof loader>();
  return <CraftView {...data} />;
}
