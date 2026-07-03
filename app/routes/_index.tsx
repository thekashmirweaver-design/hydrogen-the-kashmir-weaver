import {useLoaderData} from 'react-router';
import type {Route} from './+types/_index';
import {getHomePage} from '~/controllers';
import {getCatalogOptions} from '~/lib/catalog-options';
import {HomeView} from '~/views/home/HomeView';
import {getJournalPage} from '~/controllers/journal.controller';
import {loadHomepageFeatured} from '~/lib/homepage-featured';
import {ogMeta} from '~/lib/seo';

const HOME_TITLE = 'The Kashmir Weaver — Timeless by nature. Woven by heritage.';
const HOME_DESC =
  'Rare hand-woven pashmina from the Himalayas. Enter the world of The Kashmir Weaver — a house of Kashmiri craft, heritage and quiet luxury.';

export const meta: Route.MetaFunction = () => {
  return [
    {title: HOME_TITLE},
    {name: 'description', content: HOME_DESC},
    ...ogMeta({title: HOME_TITLE, description: HOME_DESC}),
  ];
};

export async function loader({context}: Route.LoaderArgs) {
  const catalogOptions = getCatalogOptions(context);
  const [featured, journal] = await Promise.all([
    loadHomepageFeatured(context.storefront),
    getJournalPage(context.storefront),
  ]);
  const home = await getHomePage(catalogOptions, featured);
  return {...home, journalPosts: journal.posts.slice(0, 3)};
}

export default function HomeRoute() {
  const data = useLoaderData<typeof loader>();
  return <HomeView {...data} />;
}