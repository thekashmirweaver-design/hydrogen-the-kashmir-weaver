import type {Route} from './+types/concierge';
import {ConciergeView} from '~/views/content/ConciergeView';
import {ogMeta} from '~/lib/seo';

const CONCIERGE_TITLE = 'Concierge — The Kashmir Weaver';
const CONCIERGE_DESC =
  'Private inquiries, bespoke commissions, and atelier appointments.';

export const meta: Route.MetaFunction = () => {
  return [
    {title: CONCIERGE_TITLE},
    {name: 'description', content: CONCIERGE_DESC},
    ...ogMeta({title: CONCIERGE_TITLE, description: CONCIERGE_DESC}),
  ];
};

export default function ConciergeRoute() {
  return <ConciergeView />;
}
