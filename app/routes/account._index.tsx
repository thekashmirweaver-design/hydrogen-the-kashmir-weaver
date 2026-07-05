import {redirect} from 'react-router';
import type {Route} from './+types/account._index';
import {shopifyHostedAccountUrl} from '~/lib/shopify-account-url';

export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();
  const target = shopifyHostedAccountUrl(context.env.SHOP_ID, 'orders');
  return redirect(target);
}

export default function AccountIndex() {
  return null;
}
