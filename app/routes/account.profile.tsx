import {redirect} from 'react-router';
import type {Route} from './+types/account.profile';
import {shopifyHostedAccountUrl} from '~/lib/shopify-account-url';

export async function loader({context}: Route.LoaderArgs) {
  context.customerAccount.handleAuthStatus();
  const target = shopifyHostedAccountUrl(context.env.SHOP_ID, 'profile');
  return redirect(target);
}

export default function AccountProfile() {
  return null;
}
