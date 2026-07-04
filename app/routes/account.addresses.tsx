import {redirect} from 'react-router';
import type {Route} from './+types/account.addresses';
import {shopifyHostedAccountUrl} from '~/lib/shopify-account-url';

export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();
  return redirect(shopifyHostedAccountUrl(context.env.SHOP_ID, 'addresses'));
}

export default function AccountAddresses() {
  return null;
}
