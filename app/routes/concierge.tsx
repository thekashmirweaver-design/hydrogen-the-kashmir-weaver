import type {Route} from './+types/concierge';
import {ConciergeView} from '~/views/content/ConciergeView';
import {getStoreUrlFromMatches, seoBundle} from '~/lib/seo';

const CONCIERGE_TITLE = 'Concierge — The Kashmir Weaver';
const CONCIERGE_DESC =
  'Private inquiries, bespoke commissions, and atelier appointments.';

export const meta: Route.MetaFunction = ({location, matches}) => {
  const storeUrl = getStoreUrlFromMatches(matches);
  return seoBundle({
    metadata: {title: CONCIERGE_TITLE, description: CONCIERGE_DESC},
    pathname: location.pathname,
    storeUrl,
  });
};

export default function ConciergeRoute() {
  return <ConciergeView />;
}
