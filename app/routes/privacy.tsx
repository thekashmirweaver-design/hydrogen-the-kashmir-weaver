import {useLoaderData} from 'react-router';
import type {Route} from './+types/privacy';
import {getPrivacyPage} from '~/controllers';
import {PrivacyView} from '~/views/content/PrivacyView';
import {pageMetaWithOg} from '~/lib/seo';

export const meta: Route.MetaFunction = ({data}) => {
  const title = data?.metadata?.title ?? 'Privacy — The Kashmir Weaver';
  const description = data?.metadata?.description;
  return pageMetaWithOg({title, description});
};

export async function loader({context}: Route.LoaderArgs) {
  return getPrivacyPage(context.storefront);
}

export default function PrivacyRoute() {
  const data = useLoaderData<typeof loader>();
  return <PrivacyView {...data} />;
}
