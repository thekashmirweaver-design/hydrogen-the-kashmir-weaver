import type {Route} from './+types/concierge';
import {ConciergeView} from '~/views/content/ConciergeView';

export const meta: Route.MetaFunction = () => {
  return [
    {title: 'Concierge — The Kashmir Weaver'},
    {
      name: 'description',
      content: 'Private inquiries, bespoke commissions, and atelier appointments.',
    },
  ];
};

export default function ConciergeRoute() {
  return <ConciergeView />;
}
