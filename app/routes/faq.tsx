import {useLoaderData} from 'react-router';
import type {Route} from './+types/faq';
import {getFaqPage} from '~/controllers';
import {FaqView} from '~/views/content/FaqView';

export const meta: Route.MetaFunction = ({data}) => {
  return [
    {title: data?.metadata?.title ?? 'FAQ — The Kashmir Weaver'},
    {name: 'description', content: data?.metadata?.description},
  ];
};

export async function loader() {
  return getFaqPage();
}

export default function FaqRoute() {
  const data = useLoaderData<typeof loader>();
  return <FaqView {...data} />;
}
