import {Outlet} from 'react-router';
import type {Route} from './+types/account';

/** Auth gate only — child routes redirect to Shopify-hosted account pages. */
export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();
  return {};
}

export default function AccountLayout() {
  return <Outlet />;
}
