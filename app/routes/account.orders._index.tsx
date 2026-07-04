import {redirect} from 'react-router';
import type {Route} from './+types/account.orders._index';
import {shopifyHostedAccountUrl} from '~/lib/shopify-account-url';

export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();
  return redirect(shopifyHostedAccountUrl(context.env.SHOP_ID, 'orders'));
}

export default function AccountOrders() {
  return null;
}
