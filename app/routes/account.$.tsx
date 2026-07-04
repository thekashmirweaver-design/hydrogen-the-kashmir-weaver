import {redirect} from 'react-router';
import type {Route} from './+types/account.$';
import {shopifyHostedAccountUrl} from '~/lib/shopify-account-url';

export async function loader({context}: Route.LoaderArgs) {
  await context.customerAccount.handleAuthStatus();
  return redirect(shopifyHostedAccountUrl(context.env.SHOP_ID, 'orders'));
}

export default function AccountFallback() {
  return null;
}
