import {useLoaderData} from 'react-router';
import type {Route} from './+types/heritage';
import {getHeritagePage} from '~/controllers';
import {HeritageView} from '~/views/content/HeritageView';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: data?.metadata?.title ?? 'Heritage — The Kashmir Weaver'},
    {name: 'description', content: data?.metadata?.description},
  ];
};

export async function loader() {
  return getHeritagePage();
}

export default function HeritageRoute() {
  const data = useLoaderData<typeof loader>();
  return <HeritageView {...data} />;
}
