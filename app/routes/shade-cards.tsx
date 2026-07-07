import type {Route} from './+types/shade-cards';
import {ShadeCardsView} from '~/views/content/ShadeCardsView';

import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

export const meta: Route.MetaFunction = ({location, matches}) => {
  return seoBundle({
    metadata: {
      title: 'Shade Cards — The Kashmir Weaver',
      description: 'Browse the complete Kashmir Weaver shade palette.',
    },
    pathname: location.pathname,
    storeUrl: getStoreUrlFromMatches(matches),
  });
};

export default function ShadeCardsRoute() {
  return <ShadeCardsView />;
}
