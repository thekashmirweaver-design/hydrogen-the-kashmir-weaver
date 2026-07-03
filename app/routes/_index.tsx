import {useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {getHomePage} from '~/controllers';
import {HomeView} from '~/views/home/HomeView';

export const meta: Route.MetaFunction = () => {
  return [
    {
      title: 'The Kashmir Weaver — Timeless by nature. Woven by heritage.',
    },
    {
      name: 'description',
      content:
        'Rare hand-woven pashmina from the Himalayas. Enter the world of The Kashmir Weaver — a house of Kashmiri craft, heritage and quiet luxury.',
    },
  ];
};

export async function loader() {
  return getHomePage();
}

export default function HomeRoute() {
  const data = useLoaderData<typeof loader>();
  return <HomeView {...data} />;
}
